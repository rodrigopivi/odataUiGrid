/// <reference path="./app.ts"/>
module TestApp {
  "use strict";

  export interface ITestAppScope extends ng.IScope {
    odataV4Options: OdataUiGrid.Base.IOdataInitialStateQuery;
    odataV3Options: OdataUiGrid.Base.IOdataInitialStateQuery;
    list: any[];
    list2: any[];
    gridOptions: any;
    gridOptions2: any;
  }

  export class TestAppController {
    public static $inject = ["$scope", "$odataresource", "uiGridConstants"];

    constructor($scope: ITestAppScope, $odataresource: OData.IResourceService, uiGridConstants: uiGrid.IUiGridConstants) {

      $scope.odataV4Options = <OdataUiGrid.Base.IOdataInitialStateQuery>{
        resource: $odataresource("http://services.odata.org/V4/Northwind/Northwind.svc/Orders", {}, {}, {
          isodatav4: true
        })
      };

      $scope.odataV3Options = <OdataUiGrid.Base.IOdataInitialStateQuery>{
        resource: $odataresource("http://services.odata.org/Northwind/Northwind.svc/Orders", {}, {
          odata: {
            method: "GET",
            isArray: true,
            transformResponse: (data: any) => {
              var obj = angular.fromJson(data),
                  ctx = obj["odata.metadata"],
                  count = parseInt(obj["odata.count"], 10),
                  val = obj["value"],
                  ret = {};
              if (ctx !== undefined && count !== undefined && val !== undefined) {
                ret["@odata.context"] = ctx;
                ret["@odata.count"] = count;
                ret["value"] = val;
              } else { ret = obj; }
              return ret;
            }
          }
        })
    };
    $scope.list = [];
    $scope.gridOptions = {
      data: "list",
      enableSorting: true,
      enableFiltering: true,
      enableRowSelection: false,
      columnDefs: [
        {
          field: "OrderID",
          filter: { condition: uiGridConstants.filter.GREATER_THAN_OR_EQUAL, placeholder: "Greater than or equal" }
        },
        {
          field: "EmployeeID",
          filter: { condition: uiGridConstants.filter.EXACT, placeholder: "Exact" }
        },
        {
          field: "CustomerID",
          filter: { condition: uiGridConstants.filter.STARTS_WITH, placeholder: "Starts with" }
        },
        {
          field: "Freight",
          filter: { condition: uiGridConstants.filter.GREATER_THAN, placeholder: "Greater than" }
        },
        {
          field: "ShipName",
          filter: { condition: uiGridConstants.filter.ENDS_WITH, placeholder: "Ends with" }
        },
        {
          field: "ShipCity",
          filter: { condition: uiGridConstants.filter.CONTAINS, placeholder: "Contains" }
        },
        {
          field: "ShipName",
          filter: { condition: uiGridConstants.filter.CONTAINS, placeholder: "Contains" }
        },
        {
          field: "ShipName",
          filter: { condition: uiGridConstants.filter.CONTAINS, placeholder: "Contains" }
        },
        {
          field: "OrderDate",
          filters: [
            { type: "date", condition: uiGridConstants.filter.GREATER_THAN_OR_EQUAL, placeholder: "From" },
            { type: "date", condition: uiGridConstants.filter.LESS_THAN_OR_EQUAL, placeholder: "To" }
          ]
        }
      ]
    };
    $scope.list2 = [];
    $scope.gridOptions2 = angular.copy($scope.gridOptions);
    $scope.gridOptions["data"] = "list2";
  }
};

TestApp.Modules.testApp.controller("testAppController", ["$scope", "$odataresource", "uiGridConstants",
  ($scope: ITestAppScope, $odataresource: OData.IResourceService,
    uiGridConstants: uiGrid.IUiGridConstants): TestAppController =>
    new TestAppController($scope, $odataresource, uiGridConstants)
]);
}
