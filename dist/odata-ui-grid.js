/// <reference path='../typings/tsd.d.ts' />
// main module
var OdataUiGrid;
(function (OdataUiGrid) {
    "use strict";
    var Modules = (function () {
        function Modules() {
        }
        Modules.main = angular.module("odata.ui.grid", [
            "ODataResources",
            "ui.grid",
            "ui.grid.pagination"
        ]);
        return Modules;
    })();
    OdataUiGrid.Modules = Modules;
    // note: hack to override uiGridHeaderCell template replacing the ui-grid-filter directive with a custom filter
    Modules.main.run([
        "$templateCache", function ($templateCache) {
            var uiGridHeaderCellTemplate = $templateCache.get("ui-grid/uiGridHeaderCell").toString();
            uiGridHeaderCellTemplate = uiGridHeaderCellTemplate.replace(/ui\-grid\-filter/gi, "odata-ui-grid-filter");
            $templateCache.put("ui-grid/uiGridHeaderCell", uiGridHeaderCellTemplate);
        }
    ]);
})(OdataUiGrid || (OdataUiGrid = {}));
var OdataUiGrid;
(function (OdataUiGrid_1) {
    var Base;
    (function (Base) {
        "use strict";
        /*
         * Grid that gets all data from breeze automatically, requires that a "breezeFactory" is implemented.
         *    e.g.: <div style="height: 500px"
         *               ui-grid="gridOptions"
         *               breeze-grid>
         *          </div>
         */
        var OdataUiGrid = (function () {
            function OdataUiGrid($compile, $timeout, $q, $odata, $odataresource, uiGridConstants) {
                var _this = this;
                this.priority = -200;
                this.restrict = "A";
                this.scope = false; // important: dont isolate scope;
                this.require = "uiGrid";
                // Custom props
                this.filterTermMappings = {};
                this.paginationOptions = {
                    page: 1, paginationPageSizes: [25, 50, 75], paginationPageSize: 25, sort: ""
                };
                var self = this;
                this.link = function ($scope, $element, $attrs, uiGridCtrl) {
                    angular.noop($scope, $element, $attrs, $odataresource);
                    _this.initializeGrid = function () {
                        var odataQueryOptions = $scope[$attrs.odataUiGridQueryOptions], options = $scope[$attrs.uiGrid];
                        if (options) {
                            options.useExternalPagination = true;
                            options.useExternalFiltering = true;
                            options.useExternalSorting = true;
                            var customRegisterFn = options.onRegisterApi;
                            options.onRegisterApi = function (api) {
                                if (customRegisterFn) {
                                    customRegisterFn(api);
                                }
                                odataQueryOptions.gridApi = api;
                                api.core.on.sortChanged($scope, function (grid, sortColumns) {
                                    angular.noop(grid, sortColumns);
                                    buildSortQuery(odataQueryOptions, sortColumns);
                                    _this.refresh(odataQueryOptions);
                                });
                                api.core.on.filterChanged($scope, function () { _this.refresh(odataQueryOptions); });
                                if (api.pagination) {
                                    options.currentPage = options.currentPage || _this.paginationOptions.page;
                                    options.paginationPageSize = _this.paginationOptions.paginationPageSize;
                                    options.paginationPageSizes = _this.paginationOptions.paginationPageSizes;
                                    api.pagination.on.paginationChanged($scope, function (page, paginationPageSize) {
                                        options.currentPage = page;
                                        options.paginationPageSize = paginationPageSize;
                                        _this.refresh(odataQueryOptions);
                                    });
                                }
                                _this.refresh(odataQueryOptions);
                            };
                        }
                    };
                    _this.getData = function (odataQueryOptions) {
                        var api = odataQueryOptions.gridApi, options = api.grid.options;
                        odataQueryOptions.skip = (options.currentPage - 1) * options.paginationPageSize;
                        odataQueryOptions.take = options.paginationPageSize;
                        if (api && options) {
                            var success = function (data) {
                                $timeout(function () {
                                    if (data !== undefined && data.count !== undefined) {
                                        options.totalItems = data.count;
                                        api.grid.appScope[options.data] = data;
                                    }
                                });
                            };
                            var error = function () { angular.noop(); };
                            makeOdataQuery(odataQueryOptions, _this.filterTermMappings, success, error);
                        }
                    };
                    // undo changes and get all recorde
                    _this.refresh = function (odataQueryOptions) {
                        resetCurrentQuery(odataQueryOptions);
                        _this.getData(odataQueryOptions);
                    };
                    initFilterTermMappings();
                    _this.initializeGrid();
                    function initFilterTermMappings() {
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
                    function resetCurrentQuery(odataQueryOptions) {
                        if (odataQueryOptions && odataQueryOptions.resource) {
                            odataQueryOptions.provider = odataQueryOptions.resource.odata(); // Create the provider
                        }
                        else {
                            throw new Error("Need a valid odataUiGridQueryOptions object with a valid resource.");
                        }
                    }
                    // builds the sort query
                    function buildSortQuery(odataQueryOptions, sortColumns) {
                        odataQueryOptions.sort = undefined;
                        odataQueryOptions.sortDirection = undefined;
                        sortColumns.sort(function (a, b) {
                            if (a.sort.priority === b.sort.priority) {
                                return 0;
                            }
                            return a.sort.priority > b.sort.priority ? 1 : -1;
                        }).some(function (sortCol, colIndex) {
                            odataQueryOptions.provider = odataQueryOptions.resource.odata();
                            odataQueryOptions.sort = sortCol.field;
                            odataQueryOptions.sortDirection = sortCol.sort.direction;
                            return true;
                        });
                    }
                    function extendOdataQuery(odataQueryOptions, filterOp, field, term) {
                        if (["startswith", "endswith"].indexOf(filterOp) !== -1) {
                            odataQueryOptions.provider = odataQueryOptions.provider.filter(new $odata.Func(filterOp, new $odata.Property(field), new $odata.Value(term)), true);
                        }
                        else if (filterOp === "contains") {
                            odataQueryOptions.provider = odataQueryOptions.provider["isv4"]
                                ? odataQueryOptions.provider.filter(new $odata.Func("contains", new $odata.Property(field), new $odata.Value(term)))
                                : odataQueryOptions.provider.filter(new $odata.Func("substringof", new $odata.Value(term), new $odata.Property(field)));
                        }
                        else {
                            term = isNaN(term) ? term : parseInt(term, 10);
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
                    function makeOdataQuery(odataQueryOptions, mappings, successCb, errorCb) {
                        var filterHasContent = function (filter) {
                            return filter.term !== undefined && filter.term !== null && filter.term.toString().trim() !== "";
                        }, grid = odataQueryOptions.gridApi.grid;
                        // Note: hack to bypass type safety
                        grid.options.columnDefs.filter(function (col) {
                            var ret = false;
                            if (grid && grid.options && grid.options.enableFiltering) {
                                ret = col && (col.filter && filterHasContent(col.filter))
                                    || (col.filters && col.filters.length && col.filters.some(filterHasContent));
                            }
                            return ret;
                        }).forEach(function (col) {
                            // Note: only filter columns that declare a filter condition
                            if (col.filters) {
                                col.filters.forEach(function (filter) {
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
                        if (odataQueryOptions.predicate) {
                            provider = provider.filter(odataQueryOptions.predicate);
                        }
                        if (odataQueryOptions.select) {
                            provider = provider.select(odataQueryOptions.select);
                        }
                        if (odataQueryOptions.expand && odataQueryOptions.expand.length) {
                            odataQueryOptions.expand.forEach(function (expandQuery) { provider = provider.expand(expandQuery); });
                        }
                        if (odataQueryOptions.skip) {
                            provider = provider.skip(odataQueryOptions.skip);
                        }
                        if (odataQueryOptions.take) {
                            provider = provider.take(odataQueryOptions.take);
                        }
                        if (odataQueryOptions.sort) {
                            provider = provider.orderBy(odataQueryOptions.sort, odataQueryOptions.sortDirection);
                        }
                        odataQueryOptions.provider = provider;
                        return provider.withInlineCount().query(successCb, errorCb);
                    }
                };
            }
            OdataUiGrid.$inject = ["$compile", "$timeout", "$q", "$odata", "$odataresource", "uiGridConstants"];
            return OdataUiGrid;
        })();
        Base.OdataUiGrid = OdataUiGrid;
        OdataUiGrid_1.Modules.main.directive("odataUiGrid", [
            "$compile", "$timeout", "$q", "$odata", "$odataresource", "uiGridConstants",
            function ($compile, $timeout, $q, $odata, $odataresource, uiGridConstants) {
                return new OdataUiGrid($compile, $timeout, $q, $odata, $odataresource, uiGridConstants);
            }]);
    })(Base = OdataUiGrid_1.Base || (OdataUiGrid_1.Base = {}));
})(OdataUiGrid || (OdataUiGrid = {}));
var OdataUiGrid;
(function (OdataUiGrid) {
    var Base;
    (function (Base) {
        "use strict";
        var OdataUiGridFilter = (function () {
            function OdataUiGridFilter($compile, $templateCache, uiGridConstants) {
                this.restrict = "AE";
                this.scope = false;
                this.compile = function () {
                    return {
                        pre: function ($scope, $element, $attrs) {
                            angular.noop($attrs);
                            /* note: tried a lot of ways to do this (using native ui-grid-filter if not a breeze grid)
                             *       but this "hack" is the only way got this working, seems like the ui-grid-filter directive
                             *       conflicts when inside an ng-if ng-switch or ng-hide/show */
                            var template = ($scope.col.grid.options
                                && $scope.col.grid.options.useExternalFiltering
                                && shouldUseCustomFilters())
                                ? $templateCache.get("lib/directives/odataUiGridFilterView.html")
                                : "<div ui-grid-filter></ui-grid-filter>";
                            $element.html("");
                            $element.append($compile(angular.element(template))($scope));
                            function shouldUseCustomFilters() {
                                var ret = false;
                                if ($scope.col && $scope.col.filters) {
                                    ret = $scope.col.filters.some(function (filter) {
                                        return OdataUiGridFilter.customFiltersProvided.indexOf(filter.type) !== -1;
                                    });
                                }
                                return ret;
                            }
                        },
                        post: function ($scope, $element, $attrs) {
                            angular.noop($element, $attrs);
                            if ($scope.col && $scope.col.grid) {
                            }
                        }
                    };
                };
            }
            // important: list of custom filters available
            OdataUiGridFilter.customFiltersProvided = ["date"];
            OdataUiGridFilter.$inject = ["$compile", "$templateCache", "uiGridConstants"];
            return OdataUiGridFilter;
        })();
        Base.OdataUiGridFilter = OdataUiGridFilter;
        OdataUiGrid.Modules.main.directive("odataUiGridFilter", [
            "$compile", "$templateCache", "uiGridConstants",
            function ($compile, $templateCache, uiGridConstants) {
                return new OdataUiGridFilter($compile, $templateCache, uiGridConstants);
            }]);
    })(Base = OdataUiGrid.Base || (OdataUiGrid.Base = {}));
})(OdataUiGrid || (OdataUiGrid = {}));
//# sourceMappingURL=odata-ui-grid.js.map