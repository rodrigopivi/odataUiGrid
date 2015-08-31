/// <reference path='../typings/tsd.d.ts' />
/// <reference path='../dist/odata-ui-grid.d.ts' />
module TestApp {
    "use strict";

    export class Modules {
        // ========== initialize features modules ========== //
        public static testApp: ng.IModule = angular.module("testApp", []);

        // ========== initialize main module ========== //
        public static app: ng.IModule = angular.module("app",
            [
                "odata.ui.grid",
                "testApp"
            ]);
    }
}
