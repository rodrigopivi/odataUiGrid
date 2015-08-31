module OdataUiGrid.Base {
    "use strict";


    export class OdataUiGridFilter implements ng.IDirective {
        public restrict: string = "AE";
        public scope: boolean = false;
        public compile: ng.IDirectiveCompileFn;

        // important: list of custom filters available
        public static customFiltersProvided: string[] = ["date"];

        public static $inject = ["$compile", "$templateCache", "uiGridConstants"];

        constructor(
            $compile: ng.ICompileService,
            $templateCache: ng.ITemplateCacheService,
            uiGridConstants: uiGrid.IUiGridConstants) {

            this.compile = () => {
                return {
                    pre: ($scope: any, $element: ng.IAugmentedJQuery, $attrs: ng.IAttributes) => {
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

                        function shouldUseCustomFilters(): boolean {
                            var ret = false;
                            if ($scope.col && $scope.col.filters) {
                                ret = $scope.col.filters.some((filter: any) => {
                                    return OdataUiGridFilter.customFiltersProvided.indexOf(filter.type) !== -1;
                                });
                            }
                            return ret;
                        }
                    },
                    post: ($scope: any, $element: ng.IAugmentedJQuery, $attrs: ng.IAttributes) => {
                        angular.noop($element, $attrs);
                        if ($scope.col && $scope.col.grid) {

                        }
                    }
                };
            };
        }
    }

    Modules.main.directive("odataUiGridFilter", [
        "$compile", "$templateCache", "uiGridConstants",
        ($compile: ng.ICompileService, $templateCache: ng.ITemplateCacheService,
            uiGridConstants: uiGrid.IUiGridConstants
            ): OdataUiGridFilter => new OdataUiGridFilter($compile, $templateCache, uiGridConstants)]);
}
