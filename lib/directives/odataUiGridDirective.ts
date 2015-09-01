module OdataUiGrid.Base {
  "use strict";

  export interface IOdataUiGridAttrs extends ng.IAttributes {
    /* note: this is a hacky solution of passing a scope var name that
     *        will contain the odata query options */
    uiGrid: string;
    odataUiGridQueryOptions: string;
  }

  export interface IOdataUiGridPaginationOptions { page: number; paginationPageSizes: number[]; paginationPageSize: number; }
  export interface IFilterTermMappings {
    [uiGridConstId: number]: string;
  }
  export interface IOdataQueryParams {
    predicate?: OData.Predicate; expand?: string[][]; select?: string[]; skip?: number; take?: number; sort?: string; sortDirection?: string;
  }
  export interface IOdataInitialStateQuery extends IOdataQueryParams {
    // see https://github.com/devnixs/ODataAngularResources
    resource: OData.IResourceClass<OData.IResource<any>>;
    $currentQuery?: IOdataCurrentQuery;
  }
  export interface IOdataCurrentQuery extends IOdataQueryParams {
    gridApi: uiGrid.IGridApi;
    provider: OData.Provider<OData.IResource<any>>;
  }

  export class OdataUiGrid implements ng.IDirective {
    public priority: number = -200;
    public restrict: string = "A";
    public scope: boolean = false; // important: dont isolate scope;
    public require: string = "uiGrid";
    public link: ng.IDirectiveLinkFn;

    // Custom props
    public filterTermMappings: IFilterTermMappings = {};
    public paginationOptions: IOdataUiGridPaginationOptions = <IOdataUiGridPaginationOptions>{
      page: 1, paginationPageSizes: [25, 50, 75], paginationPageSize: 25, sort: ""
    };

    public static $inject = ["$compile", "$timeout", "$q", "$odata", "$odataresource", "uiGridConstants"];

    constructor(
      $compile: ng.ICompileService,
      $timeout: ng.ITimeoutService,
      $q: ng.IQService,
      $odata: OData.Global,
      $odataresource: OData.IResourceService,
      uiGridConstants: uiGrid.IUiGridConstants) {

      var self = this;

      this.link = ($scope: ng.IScope, $element: ng.IAugmentedJQuery, $attrs: IOdataUiGridAttrs, uiGridCtrl: any) => {
        angular.noop($scope, $element, $attrs, $odataresource);

        initFilterTermMappings();
        initializeGrid();

        function initFilterTermMappings(): void {
          // uiGridConstants mappings to odata Op terms
          self.filterTermMappings[uiGridConstants.filter.STARTS_WITH] = "startswith";
          self.filterTermMappings[uiGridConstants.filter.ENDS_WITH] = "endswith";
          self.filterTermMappings[uiGridConstants.filter.EXACT] = "eq";
          self.filterTermMappings[uiGridConstants.filter.CONTAINS] = "contains";
          self.filterTermMappings[uiGridConstants.filter.GREATER_THAN] = "gt";
          self.filterTermMappings[uiGridConstants.filter.GREATER_THAN_OR_EQUAL] = "ge";
          self.filterTermMappings[uiGridConstants.filter.LESS_THAN] = "lt";
          self.filterTermMappings[uiGridConstants.filter.LESS_THAN_OR_EQUAL] = "le";
        }

        function initializeGrid(): void {
          var odataQueryOptions = <IOdataInitialStateQuery>$scope[$attrs.odataUiGridQueryOptions],
              options = $scope[$attrs.uiGrid];
          if (options) {
            options.useExternalPagination = true;
            options.useExternalFiltering = true;
            options.useExternalSorting = true;

            var customRegisterFn = options.onRegisterApi;
            options.onRegisterApi = (api: any) => {
              if (customRegisterFn) { customRegisterFn(api); }
              odataQueryOptions.$currentQuery = <IOdataCurrentQuery>{
                gridApi: api,
                provider: odataQueryOptions.resource.odata(),
                predicate: odataQueryOptions.predicate,
                expand: odataQueryOptions.expand,
                select: odataQueryOptions.select,
                skip: odataQueryOptions.skip,
                take: odataQueryOptions.take,
                sort: odataQueryOptions.sort,
                sortDirection: odataQueryOptions.sortDirection
              };
              api.core.on.sortChanged($scope, (grid: any, sortColumns: uiGrid.IColumnDef[]) => {
                angular.noop(grid);
                refresh(odataQueryOptions);
              });
              api.core.on.filterChanged($scope, () => { refresh(odataQueryOptions); });
              if (api.pagination) { // only exists when pagination is enabled
                options.currentPage = options.currentPage || self.paginationOptions.page;
                options.paginationPageSize = self.paginationOptions.paginationPageSize;
                options.paginationPageSizes = self.paginationOptions.paginationPageSizes;
                api.pagination.on.paginationChanged($scope, (page: number, paginationPageSize: number) => {
                  options.currentPage = page;
                  options.paginationPageSize = paginationPageSize;
                  refresh(odataQueryOptions);
                });
              }
              refresh(odataQueryOptions);
            };
          }
        }

        function getData(odataQueryOptions: IOdataInitialStateQuery): void {
          var api = odataQueryOptions.$currentQuery.gridApi,
            options = <uiGrid.IGridOptions>(<any>api).grid.options;
          odataQueryOptions.$currentQuery.skip = ((<any>options).currentPage - 1) * options.paginationPageSize;
          odataQueryOptions.$currentQuery.take = options.paginationPageSize;
          if (api && options) { // need a grid ready
            var success = (data: any) => {
              $timeout(() => {
                if (data !== undefined && data.count !== undefined) {
                  options.totalItems = data.count;
                  api.grid.appScope[<string>options.data] = data;
                }
              });
            };
            var error = () => { angular.noop(); };
            makeOdataQuery(odataQueryOptions, self.filterTermMappings, success, error);
          }
        }

        function refresh(odataQueryOptions: IOdataInitialStateQuery): void {
          resetCurrentQuery(odataQueryOptions);
          buildSortQuery(odataQueryOptions);
          getData(odataQueryOptions);
        }

        function resetCurrentQuery(odataQueryOptions: IOdataInitialStateQuery, api?: uiGrid.IGridApi) {
          if (odataQueryOptions && odataQueryOptions.resource) {
            var newCurrentQuery = <IOdataCurrentQuery>{
              gridApi: api || odataQueryOptions.$currentQuery.gridApi,
              provider: odataQueryOptions.resource.odata(),
              predicate: odataQueryOptions.predicate,
              expand: odataQueryOptions.expand,
              select: odataQueryOptions.select,
              skip: odataQueryOptions.skip,
              take: odataQueryOptions.take,
              sort: odataQueryOptions.sort,
              sortDirection: odataQueryOptions.sortDirection
            };
            odataQueryOptions.$currentQuery = newCurrentQuery;
          } else {
            throw new Error("Need a valid odataUiGridQueryOptions object with a valid resource.");
          }
        }

        function buildSortQuery(odataQueryOptions: IOdataInitialStateQuery): void {
          var sortColumns = <uiGrid.IGridColumn[]>(<any>odataQueryOptions.$currentQuery.gridApi.grid).columns.filter(
            (col: uiGrid.IGridColumn) => { return Object.keys(col.sort).length; }
          );
          sortColumns.sort((a: uiGrid.IGridColumn, b: uiGrid.IGridColumn) => {
            if (a.sort.priority === b.sort.priority) { return 0; }
            return a.sort.priority > b.sort.priority ? 1 : -1;
          }).some((sortCol: uiGrid.IGridColumn, colIndex: number) => {
            odataQueryOptions.$currentQuery.sort = sortCol.field;
            odataQueryOptions.$currentQuery.sortDirection = sortCol.sort.direction;
            return true;
          });
        }

        function extendOdataQuery(odataQueryOptions: IOdataInitialStateQuery, filterOp: string, field: string, term: any): void {
          if (["startswith", "endswith"].indexOf(filterOp) !== -1) {
            odataQueryOptions.$currentQuery.provider = odataQueryOptions.$currentQuery.provider.filter(
              new $odata.Func(filterOp, new $odata.Property(field), new $odata.Value(term)), true
              );
          } else if (filterOp === "contains") { // NOTE: 'contains' is for odata v4, older versions use substringof
            odataQueryOptions.$currentQuery.provider = odataQueryOptions.$currentQuery.provider["isv4"]
              ? odataQueryOptions.$currentQuery.provider.filter(new $odata.Func("contains", new $odata.Property(field), new $odata.Value(term)))
              : odataQueryOptions.$currentQuery.provider.filter(new $odata.Func("substringof", new $odata.Value(term), new $odata.Property(field)));
          } else {
            term = isNaN(term) ? term : parseInt(term, 10);
            var newPred = new $odata.Predicate(field, filterOp, term);
            odataQueryOptions.$currentQuery.predicate = odataQueryOptions.$currentQuery.predicate
              ? odataQueryOptions.$currentQuery.predicate.and(newPred)
              : newPred;
          }
        }

        /* From: http://ui-grid.info/docs/#/api/ui.grid.core.api:PublicApi
         * filterChanged is raised after the filter is changed. The nature of the watch expression doesn't allow notification
         * of what changed, so the receiver of this event will need to re-extract the filter conditions from the columns.
         */
        function makeOdataQuery(odataQueryOptions: IOdataInitialStateQuery, mappings: IFilterTermMappings,
          successCb: (result: OData.IResource<any>[]) => void, errorCb: () => void): OData.IResource<any>[] {
          var filterHasContent = (filter: any) => {
            return filter.term !== undefined && filter.term !== null && filter.term.toString().trim() !== "";
          },
            grid = odataQueryOptions.$currentQuery.gridApi.grid;
          // Note: hack to bypass type safety
          (<any>grid).columns.filter((col: uiGrid.IColumnDef) => {
            var ret = false;
            if (grid && (<any>grid).options && (<any>grid).options.enableFiltering) {
              ret = col && col.filters && col.filters.length && col.filters.some(filterHasContent);
            }
            return ret;
          }).forEach((col: uiGrid.IColumnDef) => {
            // Note: only filter columns that declare a filter condition
            if (col.filters) {
              col.filters.forEach((filter: uiGrid.IFilterOptions) => {
                // Check filter exists and has content
                if (filter && mappings[filter.condition] !== undefined && filterHasContent(filter)) {
                  extendOdataQuery(odataQueryOptions, mappings[filter.condition], col.field, filter.term);
                }
              });
            }
          });
          var provider = odataQueryOptions.$currentQuery.provider;
          if (odataQueryOptions.$currentQuery.predicate) { provider = provider.filter(odataQueryOptions.$currentQuery.predicate); }
          if (odataQueryOptions.$currentQuery.select) { provider = provider.select(odataQueryOptions.$currentQuery.select); }
          if (odataQueryOptions.$currentQuery.expand && odataQueryOptions.$currentQuery.expand.length) {
            odataQueryOptions.$currentQuery.expand.forEach((expandQuery: string[]) => { provider = provider.expand(expandQuery); });
          }
          if (odataQueryOptions.$currentQuery.skip) { provider = provider.skip(odataQueryOptions.$currentQuery.skip); }
          if (odataQueryOptions.$currentQuery.take) { provider = provider.take(odataQueryOptions.$currentQuery.take); }
          if (odataQueryOptions.$currentQuery.sort) { provider = provider.orderBy(odataQueryOptions.$currentQuery.sort, odataQueryOptions.$currentQuery.sortDirection); }
          odataQueryOptions.$currentQuery.provider = provider;
          return provider.withInlineCount().query(successCb, errorCb);
        }

      };

    }
  }

  Modules.main.directive("odataUiGrid", [
    "$compile", "$timeout", "$q", "$odata", "$odataresource", "uiGridConstants",
    ($compile: ng.ICompileService, $timeout: ng.ITimeoutService, $q: ng.IQService, $odata: OData.Global,
      $odataresource: OData.IResourceService, uiGridConstants: uiGrid.IUiGridConstants): OdataUiGrid =>
      new OdataUiGrid($compile, $timeout, $q, $odata, $odataresource, uiGridConstants)]);
}
