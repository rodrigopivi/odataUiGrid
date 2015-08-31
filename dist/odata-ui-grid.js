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
                this.filterTermMappings = {};
                this.paginationOptions = {
                    page: 1, paginationPageSizes: [25, 50, 75], paginationPageSize: 25, sort: ""
                };
                var self = this;
                this.link = function ($scope, $element, $attrs, uiGridCtrl) {
                    angular.noop($scope, $element, $attrs);
                    _this.initializeGrid = function () {
                        var options = uiGridCtrl.grid && uiGridCtrl.grid.options, api = uiGridCtrl.grid && uiGridCtrl.grid.api;
                        if (options) {
                            options.useExternalPagination = true;
                            options.useExternalFiltering = true;
                            options.useExternalSorting = true;
                        }
                        if (api) {
                            api.core.on.sortChanged($scope, function (grid, sortColumns) {
                                angular.noop(grid, sortColumns);
                                buildSortQuery(_this.currentQuery, sortColumns);
                                _this.refresh();
                            });
                            api.core.on.filterChanged($scope, function () { _this.refresh(); });
                            if (api.pagination) {
                                options.paginationPageSize = _this.paginationOptions.paginationPageSize;
                                options.paginationPageSizes = _this.paginationOptions.paginationPageSize;
                                options.page = _this.paginationOptions.page;
                                api.pagination.on.paginationChanged($scope, function (page, paginationPageSize) {
                                    _this.paginationOptions.page = page;
                                    options.page = page;
                                    _this.paginationOptions.paginationPageSize = paginationPageSize;
                                    options.paginationPageSize = paginationPageSize;
                                    _this.refresh();
                                });
                            }
                        }
                    };
                    _this.getData = function (currentQuery) {
                        var api = uiGridCtrl.grid && uiGridCtrl.grid.api, options = uiGridCtrl.grid && uiGridCtrl.grid.options;
                        currentQuery.predicate = _this.originalPredicate;
                        currentQuery.skip = (_this.paginationOptions.page - 1) * _this.paginationOptions.paginationPageSize;
                        currentQuery.take = _this.paginationOptions.paginationPageSize;
                        if (api && options) {
                            var success = function (data) {
                                $timeout(function () {
                                    if (data !== undefined && data.count !== undefined) {
                                        options.totalItems = data.count;
                                        api.grid.appScope[options.data] = data;
                                    }
                                });
                                // api.grid.appScope.$apply();
                            };
                            var error = function () { angular.noop(); };
                            makeOdataQuery(uiGridCtrl.grid, _this.filterTermMappings, currentQuery, success, error);
                        }
                    };
                    // undo changes and get all recorde
                    _this.refresh = function () {
                        resetCurrentQuery();
                        _this.getData(_this.currentQuery);
                    };
                    initFilterTermMappings();
                    init();
                    _this.initializeGrid();
                    _this.refresh();
                    function init() {
                        var api = uiGridCtrl.grid && uiGridCtrl.grid.api, odataQueryOptions = api && api.grid.appScope[$attrs.odataUiGridQueryOptions];
                        if (odataQueryOptions.predicate) {
                            self.originalPredicate = odataQueryOptions.predicate;
                        }
                        self.currentQuery = odataQueryOptions;
                        resetCurrentQuery();
                    }
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
                    function resetCurrentQuery() {
                        if (self.currentQuery && self.currentQuery.resource) {
                            self.currentQuery.provider = self.currentQuery.resource.odata(); // Create the provider
                            self.currentQuery.predicate = self.originalPredicate; // Restore original predicate
                            // Note: Attribute 'isv4' is not existant at the d.ts file (avoid interface check for now)
                            if ($attrs.odataUiGridUseV4 !== undefined) {
                                self.currentQuery.provider["isv4"] = true;
                            }
                        }
                        else {
                            throw new Error("Need a valid odataUiGridQueryOptions object with a valid resource.");
                        }
                    }
                    // builds the sort query
                    function buildSortQuery(currentQuery, sortColumns) {
                        currentQuery.sort = undefined;
                        currentQuery.sortDirection = undefined;
                        sortColumns.sort(function (a, b) {
                            if (a.sort.priority === b.sort.priority) {
                                return 0;
                            }
                            return a.sort.priority > b.sort.priority ? 1 : -1;
                        }).some(function (sortCol, colIndex) {
                            currentQuery.provider = currentQuery.resource.odata();
                            currentQuery.sort = sortCol.field;
                            currentQuery.sortDirection = sortCol.sort.direction;
                            return true;
                        });
                    }
                    function extendOdataQuery(currentQuery, filterOp, field, term) {
                        if (["startswith", "endswith"].indexOf(filterOp) !== -1) {
                            currentQuery.provider = currentQuery.provider.filter(new $odata.Func(filterOp, new $odata.Property(field), new $odata.Value(term)), true);
                        }
                        else if (filterOp === "contains") {
                            currentQuery.provider = currentQuery.provider["isv4"]
                                ? currentQuery.provider.filter(new $odata.Func("contains", new $odata.Property(field), new $odata.Value(term)))
                                : currentQuery.provider.filter(new $odata.Func("substringof", new $odata.Value(term), new $odata.Property(field)));
                        }
                        else {
                            term = isNaN(term) ? term : parseInt(term, 10);
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
                    function makeOdataQuery(grid, mappings, currentQuery, successCb, errorCb) {
                        var filterHasContent = function (filter) {
                            return filter.term !== undefined && filter.term !== null && filter.term.toString().trim() !== "";
                        };
                        grid.columns.filter(function (col) {
                            return col.enableFiltering && col.filters.length && col.filters.some(filterHasContent);
                        }).forEach(function (col) {
                            // Note: only filter columns that declare a filter condition
                            col.filters.forEach(function (filter) {
                                // Check filter exists and has content
                                if (mappings[filter.condition] !== undefined && filterHasContent(filter)) {
                                    extendOdataQuery(currentQuery, mappings[filter.condition], col.field, filter.term);
                                }
                            });
                        });
                        var provider = currentQuery.provider;
                        if (currentQuery.predicate) {
                            provider = provider.filter(currentQuery.predicate);
                        }
                        if (currentQuery.select) {
                            provider = provider.select(currentQuery.select);
                        }
                        if (currentQuery.expand && currentQuery.expand.length) {
                            currentQuery.expand.forEach(function (expandQuery) { provider = provider.expand(expandQuery); });
                        }
                        if (currentQuery.skip) {
                            provider = provider.skip(currentQuery.skip);
                        }
                        if (currentQuery.take) {
                            provider = provider.take(currentQuery.take);
                        }
                        if (currentQuery.sort) {
                            provider = provider.orderBy(currentQuery.sort, currentQuery.sortDirection);
                        }
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