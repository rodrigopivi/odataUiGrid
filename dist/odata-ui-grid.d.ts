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
    interface IOdataUiGridInstance extends uiGrid.IGridInstance {
        options: uiGrid.IGridOptions;
        api: uiGrid.IGridApi;
    }
    interface IOdataUiGridAttrs extends ng.IAttributes {
        odataUiGridQueryOptions: string;
        odataUiGridUseV4: string;
    }
    interface IOdataUiGridPaginationOptions {
        page: number;
        paginationPageSizes: number[];
        paginationPageSize: number;
    }
    interface IFilterTermMappings {
        [uiGridConstId: number]: string;
    }
    interface IOdataUiGridQuery {
        resource: OData.IResourceClass<OData.IResource<any>>;
        provider: OData.Provider<OData.IResource<any>>;
        predicate?: OData.Predicate;
        expand?: string[][];
        select?: string[];
        skip?: number;
        take?: number;
        sort?: string;
        sortDirection?: string;
    }
    class OdataUiGrid implements ng.IDirective {
        priority: number;
        restrict: string;
        scope: boolean;
        require: string;
        link: ng.IDirectiveLinkFn;
        currentQuery: IOdataUiGridQuery;
        private originalPredicate;
        filterTermMappings: IFilterTermMappings;
        paginationOptions: IOdataUiGridPaginationOptions;
        initializeGrid: () => void;
        getData: (currentQuery: IOdataUiGridQuery) => void;
        refresh: () => void;
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
