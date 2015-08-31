/// <reference path='../typings/tsd.d.ts' />
// main module
module OdataUiGrid {
    "use strict";

    export class Modules {
        public static main: ng.IModule = angular.module("odata.ui.grid", [
          "ODataResources",
          "ui.grid",
          "ui.grid.pagination"
        ]);
    }
    export module Base {}
    export module Tests {}

    // note: hack to override uiGridHeaderCell template replacing the ui-grid-filter directive with a custom filter
    Modules.main.run([
        "$templateCache", ($templateCache: ng.ITemplateCacheService) => {
            var uiGridHeaderCellTemplate = $templateCache.get("ui-grid/uiGridHeaderCell").toString();
            uiGridHeaderCellTemplate = uiGridHeaderCellTemplate.replace(/ui\-grid\-filter/gi, "odata-ui-grid-filter");
            $templateCache.put("ui-grid/uiGridHeaderCell", uiGridHeaderCellTemplate);
        }
    ]);
}
