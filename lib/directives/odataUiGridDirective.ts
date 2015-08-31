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

  export interface IOdataUiGridQuery {
    // see https://github.com/devnixs/ODataAngularResources
    resource: OData.IResourceClass<OData.IResource<any>>;
    provider: OData.Provider<OData.IResource<any>>;
    gridApi: uiGrid.IGridApi;
    predicate?: OData.Predicate;
    expand?: string[][]; // array of arrays to allow nested expands eg. [["City","Country"],["Orders"]]
    select?: string[];
    skip?: number;
    take?: number;
    sort?: string;
    sortDirection?: string;
  }

  /*
   * Grid that gets all data from breeze automatically, requires that a "breezeFactory" is implemented.
   *    e.g.: <div style="height: 500px"
   *               ui-grid="gridOptions"
   *               breeze-grid>
   *          </div>
   */
  export class OdataUiGrid implements ng.IDirective {
    public priority: number = -200;
    public restrict: string = "A";
    public scope: boolean = false; // important: dont isolate scope;
    public require: string = "uiGrid";
    public link: ng.IDirectiveLinkFn;

    // Custom props
    public filterTermMappings: IFilterTermMappings = {};
    public paginationOptions = <IOdataUiGridPaginationOptions>{
      page: 1, paginationPageSizes: [25, 50, 75], paginationPageSize: 25, sort: ""
    };

    public initializeGrid: () => void;
    public getData: (odataQueryOptions: IOdataUiGridQuery) => void;
    public refresh: (odataQueryOptions: IOdataUiGridQuery) => void;

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

        this.initializeGrid = (): void => {
          var odataQueryOptions = <IOdataUiGridQuery>$scope[$attrs.odataUiGridQueryOptions],
            options = $scope[$attrs.uiGrid];
          if (options) {
            options.useExternalPagination = true;
            options.useExternalFiltering = true;
            options.useExternalSorting = true;

            var customRegisterFn = options.onRegisterApi;
            options.onRegisterApi = (api: any) => {
              if (customRegisterFn) { customRegisterFn(api); }
              odataQueryOptions.gridApi = api;
              api.core.on.sortChanged($scope, (grid: any, sortColumns: uiGrid.IColumnDef[]) => {
                angular.noop(grid, sortColumns);
                buildSortQuery(odataQueryOptions, sortColumns);
                this.refresh(odataQueryOptions);
              });
              api.core.on.filterChanged($scope, () => { this.refresh(odataQueryOptions); });
              if (api.pagination) { // only exists when pagination is enabled
                options.currentPage = options.currentPage || this.paginationOptions.page;
                options.paginationPageSize = this.paginationOptions.paginationPageSize;
                options.paginationPageSizes = this.paginationOptions.paginationPageSizes;
                api.pagination.on.paginationChanged($scope, (page: number, paginationPageSize: number) => {
                  options.currentPage = page;
                  options.paginationPageSize = paginationPageSize;
                  this.refresh(odataQueryOptions);
                });
              }
              this.refresh(odataQueryOptions);
            };
          }
        };

        this.getData = (odataQueryOptions: IOdataUiGridQuery): void => {
          var api = odataQueryOptions.gridApi,
            options = <uiGrid.IGridOptions>(<any>api).grid.options;
          odataQueryOptions.skip = ((<any>options).currentPage - 1) * options.paginationPageSize;
          odataQueryOptions.take = options.paginationPageSize;
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
            makeOdataQuery(odataQueryOptions, this.filterTermMappings, success, error);
          }
        };
        // undo changes and get all recorde
        this.refresh = (odataQueryOptions: IOdataUiGridQuery): void => {
          resetCurrentQuery(odataQueryOptions);
          this.getData(odataQueryOptions);
        };

        initFilterTermMappings();
        this.initializeGrid();

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

        function resetCurrentQuery(odataQueryOptions: IOdataUiGridQuery) {
          if (odataQueryOptions && odataQueryOptions.resource) {
            odataQueryOptions.provider = odataQueryOptions.resource.odata(); // Create the provider
          } else {
            throw new Error("Need a valid odataUiGridQueryOptions object with a valid resource.");
          }
        }

        // builds the sort query
        function buildSortQuery(odataQueryOptions: IOdataUiGridQuery, sortColumns: uiGrid.IColumnDef[]): void {
          odataQueryOptions.sort = undefined;
          odataQueryOptions.sortDirection = undefined;
          sortColumns.sort((a: uiGrid.IColumnDef, b: uiGrid.IColumnDef) => {
            if (a.sort.priority === b.sort.priority) { return 0; }
            return a.sort.priority > b.sort.priority ? 1 : -1;
          }).some((sortCol: uiGrid.IColumnDef, colIndex: number) => {
            odataQueryOptions.provider = odataQueryOptions.resource.odata();
            odataQueryOptions.sort = sortCol.field;
            odataQueryOptions.sortDirection = sortCol.sort.direction;
            return true;
          });
        }

        function extendOdataQuery(odataQueryOptions: IOdataUiGridQuery, filterOp: string, field: string, term: any): void {
          if (["startswith", "endswith"].indexOf(filterOp) !== -1) {
            odataQueryOptions.provider = odataQueryOptions.provider.filter(
              new $odata.Func(filterOp, new $odata.Property(field), new $odata.Value(term)), true
              );
          } else if (filterOp === "contains") { // NOTE: 'contains' is for odata v4, older versions use substringof
            odataQueryOptions.provider = odataQueryOptions.provider["isv4"]
              ? odataQueryOptions.provider.filter(new $odata.Func("contains", new $odata.Property(field), new $odata.Value(term)))
              : odataQueryOptions.provider.filter(new $odata.Func("substringof", new $odata.Value(term), new $odata.Property(field)));
          } else {
            term = isNaN(<any>term) ? term : parseInt(term, 10);
            var newPred = new $odata.Predicate(field, filterOp, term);
            odataQueryOptions.predicate = odataQueryOptions.predicate
              ? odataQueryOptions.predicate.and(newPred)
              : newPred;
          }
        }

        /* From: http://ui-grid.info/docs/#/api/ui.grid.core.api:PublicApi
         * filterChanged is raised after the filter is changed. The nature of the watch expression doesn't allow notification
         * of what changed, so the receiver of this event will need to re-extract the filter conditions from the columns.
         */
        function makeOdataQuery(odataQueryOptions: IOdataUiGridQuery, mappings: IFilterTermMappings,
          successCb: (result: OData.IResource<any>[]) => void, errorCb: () => void): OData.IResource<any>[] {
          var filterHasContent = (filter: any) => {
            return filter.term !== undefined && filter.term !== null && filter.term.toString().trim() !== "";
          },
            grid = odataQueryOptions.gridApi.grid;
          // Note: hack to bypass type safety
          (<any>grid).options.columnDefs.filter((col: uiGrid.IColumnDef) => {
            var ret = false;
            if (grid && (<any>grid).options && (<any>grid).options.enableFiltering) {
              ret = col && (col.filter && filterHasContent(col.filter))
                || (col.filters && col.filters.length && col.filters.some(filterHasContent));
            }
            return ret;
          }).forEach((col: uiGrid.IColumnDef) => {
            // Note: only filter columns that declare a filter condition
            if (col.filters) {
              col.filters.forEach((filter: uiGrid.IFilterOptions) => {
                // Check filter exists and has content
                if (mappings[filter.condition] !== undefined && filterHasContent(filter)) {
                  extendOdataQuery(odataQueryOptions, mappings[filter.condition], col.field, filter.term);
                }
              });
            }
            if (col.filter) {
              if (mappings[col.filter.condition] !== undefined && filterHasContent(col.filter)) {
                extendOdataQuery(odataQueryOptions, mappings[col.filter.condition], col.field, col.filter.term);
              }
            }
          });
          var provider = odataQueryOptions.provider;
          if (odataQueryOptions.predicate) { provider = provider.filter(odataQueryOptions.predicate); }
          if (odataQueryOptions.select) { provider = provider.select(odataQueryOptions.select); }
          if (odataQueryOptions.expand && odataQueryOptions.expand.length) {
            odataQueryOptions.expand.forEach((expandQuery: string[]) => { provider = provider.expand(expandQuery); });
          }
          if (odataQueryOptions.skip) { provider = provider.skip(odataQueryOptions.skip); }
          if (odataQueryOptions.take) { provider = provider.take(odataQueryOptions.take); }
          if (odataQueryOptions.sort) { provider = provider.orderBy(odataQueryOptions.sort, odataQueryOptions.sortDirection); }
          odataQueryOptions.provider = provider;
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
