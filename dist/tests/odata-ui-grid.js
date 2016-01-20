/// <reference path='../../../typings/tsd.d.ts' />
/// <reference path='../../../dist/odata-ui-grid.d.ts' />
var OdataUiGrid;
(function (OdataUiGrid) {
    var Tests;
    (function (Tests) {
        var SetupTestData = (function () {
            function SetupTestData() {
            }
            SetupTestData.app = angular.module("odataUiGridTestApp", ["odata.ui.grid"]);
            return SetupTestData;
        })();
        describe("test odataUiGrid", function () {
            var _$rootScope, $scope;
            beforeEach(angular.mock.module("odataUiGridTestApp"));
            beforeEach(inject(function ($rootScope) {
                _$rootScope = $rootScope;
                $scope = _$rootScope.$new(); // create a test scope
            }));
            it("works correctly", function () {
                expect(true).toBeTruthy();
            });
        });
    })(Tests = OdataUiGrid.Tests || (OdataUiGrid.Tests = {}));
})(OdataUiGrid || (OdataUiGrid = {}));
