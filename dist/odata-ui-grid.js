/**
 * odata-ui-grid - 0.0.2
 * odata uiGrid
 * 
 * 
 * Released under the MIT license.
 * Copyright 2016 Rodrigo Pimentel and contributors.
 */
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
        var OdataUiGrid = (function () {
            function OdataUiGrid($compile, $timeout, $q, $odata, $odataresource, uiGridConstants) {
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
                    var cancelCurrentRequest;
                    var searchDelay;
                    initFilterTermMappings();
                    initializeGrid();
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
                    function initializeGrid() {
                        var odataQueryOptions = $scope.$eval($attrs.odataUiGridQueryOptions), options = $scope.$eval($attrs.uiGrid);
                        if (options) {
                            options.useExternalPagination = true;
                            options.useExternalFiltering = true;
                            options.useExternalSorting = true;
                            var customRegisterFn = options.onRegisterApi;
                            options.onRegisterApi = function (api) {
                                if (customRegisterFn) {
                                    customRegisterFn(api);
                                }
                                odataQueryOptions.$currentQuery = {
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
                                api.core.on.sortChanged($scope, function (grid, sortColumns) {
                                    angular.noop(grid);
                                    refresh(odataQueryOptions);
                                });
                                api.core.on.filterChanged($scope, function () { refresh(odataQueryOptions); });
                                if (api.pagination) {
                                    options.currentPage = options.currentPage || self.paginationOptions.page;
                                    options.paginationPageSize = self.paginationOptions.paginationPageSize;
                                    options.paginationPageSizes = self.paginationOptions.paginationPageSizes;
                                    api.pagination.on.paginationChanged($scope, function (page, paginationPageSize) {
                                        options.currentPage = page;
                                        options.paginationPageSize = paginationPageSize;
                                        refresh(odataQueryOptions);
                                    });
                                }
                                refresh(odataQueryOptions);
                            };
                        }
                    }
                    function getData(odataQueryOptions) {
                        var api = odataQueryOptions.$currentQuery.gridApi, options = api.grid.options;
                        odataQueryOptions.$currentQuery.skip = (options.currentPage - 1) * options.paginationPageSize;
                        odataQueryOptions.$currentQuery.take = options.paginationPageSize;
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
                            makeOdataQuery(odataQueryOptions, self.filterTermMappings).then(success, error);
                        }
                    }
                    function refresh(odataQueryOptions) {
                        if (searchDelay) {
                            $timeout.cancel(searchDelay);
                            searchDelay = null;
                        }
                        searchDelay = $timeout(function (opts) {
                            resetCurrentQuery(opts);
                            buildSortQuery(opts);
                            getData(opts);
                        }, odataQueryOptions.debounceDelay, true, odataQueryOptions);
                    }
                    function resetCurrentQuery(odataQueryOptions, api) {
                        if (odataQueryOptions && odataQueryOptions.resource) {
                            var newCurrentQuery = {
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
                        }
                        else {
                            throw new Error("Need a valid odataUiGridQueryOptions object with a valid resource.");
                        }
                    }
                    function buildSortQuery(odataQueryOptions) {
                        var sortColumns = odataQueryOptions.$currentQuery.gridApi.grid.columns.filter(function (col) { return Object.keys(col.sort).length; });
                        sortColumns.sort(function (a, b) {
                            if (a.sort.priority === b.sort.priority) {
                                return 0;
                            }
                            return a.sort.priority > b.sort.priority ? 1 : -1;
                        }).some(function (sortCol, colIndex) {
                            odataQueryOptions.$currentQuery.sort = sortCol.field;
                            odataQueryOptions.$currentQuery.sortDirection = sortCol.sort.direction;
                            return true;
                        });
                    }
                    function extendOdataQuery(odataQueryOptions, filterOp, field, term) {
                        field = field.replace(".", "/");
                        if (["startswith", "endswith"].indexOf(filterOp) !== -1) {
                            odataQueryOptions.$currentQuery.provider = odataQueryOptions.$currentQuery.provider.filter(new $odata.Func(filterOp, new $odata.Property(field), new $odata.Value(term)), true);
                        }
                        else if (filterOp === "contains") {
                            odataQueryOptions.$currentQuery.provider = odataQueryOptions.$currentQuery.provider["isv4"]
                                ? odataQueryOptions.$currentQuery.provider.filter(new $odata.Func("contains", new $odata.Property(field), new $odata.Value(term)))
                                : odataQueryOptions.$currentQuery.provider.filter(new $odata.Func("substringof", new $odata.Value(term), new $odata.Property(field)));
                        }
                        else {
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
                    function makeOdataQuery(odataQueryOptions, mappings) {
                        if (cancelCurrentRequest) {
                            cancelCurrentRequest();
                        }
                        var filterHasContent = function (filter) {
                            return filter.term !== undefined && filter.term !== null && filter.term.toString().trim() !== "";
                        }, grid = odataQueryOptions.$currentQuery.gridApi.grid;
                        // Note: hack to bypass type safety
                        grid.columns.filter(function (col) {
                            var ret = false;
                            if (grid && grid.options && grid.options.enableFiltering) {
                                ret = col && col.filters && col.filters.length && col.filters.some(filterHasContent);
                            }
                            return ret;
                        }).forEach(function (col) {
                            // Note: only filter columns that declare a filter condition
                            if (col.filters) {
                                col.filters.forEach(function (filter) {
                                    // Check filter exists and has content
                                    if (filter && mappings[filter.condition] !== undefined && filterHasContent(filter)) {
                                        extendOdataQuery(odataQueryOptions, mappings[filter.condition], col.field, filter.term);
                                    }
                                });
                            }
                        });
                        var provider = odataQueryOptions.$currentQuery.provider;
                        if (odataQueryOptions.$currentQuery.predicate) {
                            provider = provider.filter(odataQueryOptions.$currentQuery.predicate);
                        }
                        if (odataQueryOptions.$currentQuery.select) {
                            provider = provider.select(odataQueryOptions.$currentQuery.select);
                        }
                        if (odataQueryOptions.$currentQuery.expand && odataQueryOptions.$currentQuery.expand.length) {
                            odataQueryOptions.$currentQuery.expand.forEach(function (expandQuery) { provider = provider.expand(expandQuery); });
                        }
                        if (odataQueryOptions.$currentQuery.skip) {
                            provider = provider.skip(odataQueryOptions.$currentQuery.skip);
                        }
                        if (odataQueryOptions.$currentQuery.take) {
                            provider = provider.take(odataQueryOptions.$currentQuery.take);
                        }
                        if (odataQueryOptions.$currentQuery.sort) {
                            provider = provider.orderBy(odataQueryOptions.$currentQuery.sort, odataQueryOptions.$currentQuery.sortDirection);
                        }
                        odataQueryOptions.$currentQuery.provider = provider;
                        var request = $q(function (resolve, reject) {
                            cancelCurrentRequest = function () {
                                reject();
                                cancelCurrentRequest = null;
                            };
                            provider.withInlineCount().query(function (result) {
                                cancelCurrentRequest = null;
                                resolve(result);
                            }, function () {
                                cancelCurrentRequest = null;
                                reject();
                            });
                        });
                        return request;
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
                        }
                    };
                };
            }
            // Important: list of custom filters available, we could add here filters like "date", that will be rendered as custom directives
            // TODO: add date filter that uses a widget to select the date range.
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