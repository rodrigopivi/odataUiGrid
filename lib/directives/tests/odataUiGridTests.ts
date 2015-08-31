/// <reference path='../../../typings/tsd.d.ts' />
/// <reference path='../../../dist/odata-ui-grid.d.ts' />
module OdataUiGrid.Tests {
    class SetupTestData {
        public static app: ng.IModule = angular.module("odataUiGridTestApp", ["odata.ui.grid"]);
    }

    describe("test odataUiGrid", () => {
        var _$rootScope: ng.IRootScopeService,
            $scope: any;

        beforeEach(angular.mock.module("odataUiGridTestApp"));
        beforeEach(inject(($rootScope: ng.IRootScopeService) => {
            _$rootScope = $rootScope;
            $scope = _$rootScope.$new(); // create a test scope
        }));

        it("works correctly", function () {
            expect(true).toBeTruthy();
        });
    });
}
