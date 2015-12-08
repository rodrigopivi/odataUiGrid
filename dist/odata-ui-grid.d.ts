/**
 * odata-ui-grid - 0.0.2
 * odata uiGrid
 * 
 * 
 * Released under the MIT license.
 * Copyright 2015 Rodrigo Pimentel and contributors.
 */
/// <reference path="../typings/tsd.d.ts" />
declare module OdataUiGrid {
    class Modules {
        static main: ng.IModule;
    }
    module Base {
    }
    module Tests {
    }
}
declare module OdataUiGrid.Base {
    interface IOdataUiGridAttrs extends ng.IAttributes {
        uiGrid: string;
        odataUiGridQueryOptions: string;
    }
    interface IOdataUiGridPaginationOptions {
        page: number;
        paginationPageSizes: number[];
        paginationPageSize: number;
    }
    interface IFilterTermMappings {
        [uiGridConstId: number]: string;
    }
    interface IOdataQueryParams {
        predicate?: OData.Predicate;
        expand?: string[][];
        select?: string[];
        skip?: number;
        take?: number;
        sort?: string;
        sortDirection?: string;
    }
    interface IOdataInitialStateQuery extends IOdataQueryParams {
        resource: OData.IResourceClass<OData.IResource<any>>;
        $currentQuery?: IOdataCurrentQuery;
        debounceDelay: number;
    }
    interface IOdataCurrentQuery extends IOdataQueryParams {
        gridApi: uiGrid.IGridApi;
        provider: OData.Provider<OData.IResource<any>>;
    }
    class OdataUiGrid implements ng.IDirective {
        priority: number;
        restrict: string;
        scope: boolean;
        require: string;
        link: ng.IDirectiveLinkFn;
        filterTermMappings: IFilterTermMappings;
        paginationOptions: IOdataUiGridPaginationOptions;
        static $inject: string[];
        constructor($compile: ng.ICompileService, $timeout: ng.ITimeoutService, $q: ng.IQService, $odata: OData.Global, $odataresource: OData.IResourceService, uiGridConstants: uiGrid.IUiGridConstants);
    }
}
declare module OdataUiGrid.Base {
    class OdataUiGridFilter implements ng.IDirective {
        restrict: string;
        scope: boolean;
        compile: ng.IDirectiveCompileFn;
        static customFiltersProvided: string[];
        static $inject: string[];
        constructor($compile: ng.ICompileService, $templateCache: ng.ITemplateCacheService, uiGridConstants: uiGrid.IUiGridConstants);
    }
}
