module OdataUiGrid.Base {
  "use strict";

  export interface IOdataUiGridInstance extends uiGrid.IGridInstance {
    options: uiGrid.IGridOptions;
    api: uiGrid.IGridApi;
  }
  export interface IOdataUiGridAttrs extends ng.IAttributes {
    /* note: this is a hacky solution of passing a scope var name that
     *        will contain the odata query options */
    odataUiGridQueryOptions: string;
    odataUiGridUseV4: string;
  }

  export interface IOdataUiGridPaginationOptions {
    page: number;
    paginationPageSizes: number[];
    paginationPageSize: number;
  }
  export interface IFilterTermMappings {
    [uiGridConstId: number]: string;
  }

  export interface IOdataUiGridQuery {
    // see https://github.com/devnixs/ODataAngularResources
    resource: OData.IResourceClass<OData.IResource<any>>;
    provider: OData.Provider<OData.IResource<any>>;
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
    public currentQuery: IOdataUiGridQuery;
    private originalPredicate: OData.Predicate;
    public filterTermMappings: IFilterTermMappings = {};
    public paginationOptions = <IOdataUiGridPaginationOptions>{
      page: 1, paginationPageSizes: [25, 50, 75], paginationPageSize: 25, sort: ""
    };

    public initializeGrid: () => void;
    public getData: (currentQuery: IOdataUiGridQuery) => void;
    public refresh: () => void;

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
        angular.noop($scope, $element, $attrs);

        this.initializeGrid = (): void => {
          var options = uiGridCtrl.grid && uiGridCtrl.grid.options,
            api = uiGridCtrl.grid && uiGridCtrl.grid.api;
          if (options) {
            options.useExternalPagination = true;
            options.useExternalFiltering = true;
            options.useExternalSorting = true;
          }
          if (api) {
            api.core.on.sortChanged($scope, (grid: any, sortColumns: uiGrid.IColumnDef[]) => {
              angular.noop(grid, sortColumns);
              buildSortQuery(this.currentQuery, sortColumns);
              this.refresh();
            });
            api.core.on.filterChanged($scope, () => { this.refresh(); });

            if (api.pagination) { // only exists when pagination is enabled
              options.paginationPageSize = this.paginationOptions.paginationPageSize;
              options.paginationPageSizes = this.paginationOptions.paginationPageSize;
              options.page = this.paginationOptions.page;
              api.pagination.on.paginationChanged($scope, (page: number, paginationPageSize: number) => {
                this.paginationOptions.page = page;
                options.page = page;
                this.paginationOptions.paginationPageSize = paginationPageSize;
                options.paginationPageSize = paginationPageSize;
                this.refresh();
              });
            }
          }
        };

        this.getData = (currentQuery: IOdataUiGridQuery): void => {
          var api = uiGridCtrl.grid && uiGridCtrl.grid.api,
            options = uiGridCtrl.grid && uiGridCtrl.grid.options;
          currentQuery.predicate = this.originalPredicate;
          currentQuery.skip = (this.paginationOptions.page - 1) * this.paginationOptions.paginationPageSize;
          currentQuery.take = this.paginationOptions.paginationPageSize;

          if (api && options) { // need a grid ready
            var success = (data: any) => {
              $timeout(() => {
                if (data !== undefined && data.count !== undefined) {
                  options.totalItems = data.count;
                  api.grid.appScope[options.data] = data;
                }
              });
              // api.grid.appScope.$apply();
            };
            var error = () => { angular.noop(); };
            makeOdataQuery(uiGridCtrl.grid, this.filterTermMappings, currentQuery, success, error);
          }
        };

        // undo changes and get all recorde
        this.refresh = (): void => {
          resetCurrentQuery();
          this.getData(this.currentQuery);
        };

        initFilterTermMappings();
        init();
        this.initializeGrid();
        this.refresh();

        function init() {
          var api = uiGridCtrl.grid && uiGridCtrl.grid.api,
            odataQueryOptions = api && api.grid.appScope[$attrs.odataUiGridQueryOptions];
          if (odataQueryOptions.predicate) { self.originalPredicate = odataQueryOptions.predicate; }
          self.currentQuery = odataQueryOptions;
          resetCurrentQuery();
        }

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

        function resetCurrentQuery() {
          if (self.currentQuery && self.currentQuery.resource) {
            self.currentQuery.provider = self.currentQuery.resource.odata(); // Create the provider
            self.currentQuery.predicate = self.originalPredicate; // Restore original predicate
            // Note: Attribute 'isv4' is not existant at the d.ts file (avoid interface check for now)
            if ($attrs.odataUiGridUseV4 !== undefined) { self.currentQuery.provider["isv4"] = true; }
          } else {
            throw new Error("Need a valid odataUiGridQueryOptions object with a valid resource.");
          }
        }

        // builds the sort query
        function buildSortQuery(currentQuery: IOdataUiGridQuery, sortColumns: uiGrid.IColumnDef[]): void {
          currentQuery.sort = undefined;
          currentQuery.sortDirection = undefined;
          sortColumns.sort((a: uiGrid.IColumnDef, b: uiGrid.IColumnDef) => {
            if (a.sort.priority === b.sort.priority) { return 0; }
            return a.sort.priority > b.sort.priority ? 1 : -1;
          }).some((sortCol: uiGrid.IColumnDef, colIndex: number) => {
            currentQuery.provider = currentQuery.resource.odata();
            currentQuery.sort = sortCol.field;
            currentQuery.sortDirection = sortCol.sort.direction;
            return true;
          });
        }

        function extendOdataQuery(currentQuery: IOdataUiGridQuery, filterOp: string, field: string, term: any): void {
          if (["startswith", "endswith"].indexOf(filterOp) !== -1) {
            currentQuery.provider = currentQuery.provider.filter(
              new $odata.Func(filterOp, new $odata.Property(field), new $odata.Value(term)), true
              );
          } else if (filterOp === "contains") { // NOTE: 'contains' is for odata v4, older versions use substringof
            currentQuery.provider = currentQuery.provider["isv4"]
            ? currentQuery.provider.filter(new $odata.Func("contains", new $odata.Property(field), new $odata.Value(term)))
            : currentQuery.provider.filter(new $odata.Func("substringof", new $odata.Value(term), new $odata.Property(field)));
          } else {
            term = isNaN(<any>term) ? term : parseInt(term, 10);
            var newPred = new $odata.Predicate(field, filterOp, term);
            currentQuery.predicate = currentQuery.predicate
              ? currentQuery.predicate.and(newPred)
              : newPred;
          }
        }

        /* From: http://ui-grid.info/docs/#/api/ui.grid.core.api:PublicApi
         * filterChanged is raised after the filter is changed. The nature of the watch expression doesn't allow notification
         * of what changed, so the receiver of this event will need to re-extract the filter conditions from the columns.
         */
        function makeOdataQuery(grid: any, mappings: IFilterTermMappings, currentQuery: IOdataUiGridQuery,
          successCb: (result: OData.IResource<any>[]) => void, errorCb: () => void): OData.IResource<any>[] {
          var filterHasContent = (filter: any) => {
            return filter.term !== undefined && filter.term !== null && filter.term.toString().trim() !== "";
          };
          grid.columns.filter((col: uiGrid.IColumnDef) => {
            return col.enableFiltering && col.filters.length && col.filters.some(filterHasContent);
          }).forEach((col: uiGrid.IColumnDef) => {
            // Note: only filter columns that declare a filter condition
            col.filters.forEach((filter: uiGrid.IFilterOptions) => {
              // Check filter exists and has content
              if (mappings[filter.condition] !== undefined && filterHasContent(filter)) {
                extendOdataQuery(currentQuery, mappings[filter.condition], col.field, filter.term);
              }
            });
          });
          var provider = currentQuery.provider;
          if (currentQuery.predicate) { provider = provider.filter(currentQuery.predicate); }
          if (currentQuery.select) { provider = provider.select(currentQuery.select); }
          if (currentQuery.expand && currentQuery.expand.length) {
            currentQuery.expand.forEach((expandQuery: string[]) => { provider = provider.expand(expandQuery); });
          }
          if (currentQuery.skip) { provider = provider.skip(currentQuery.skip); }
          if (currentQuery.take) { provider = provider.take(currentQuery.take); }
          if (currentQuery.sort) { provider = provider.orderBy(currentQuery.sort, currentQuery.sortDirection); }
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
