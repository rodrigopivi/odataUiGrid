/// <reference path="./app.ts"/>
module TestApp {
  "use strict";

  export interface ITestAppScope extends ng.IScope {
    odataV4Options: OdataUiGrid.Base.IOdataUiGridQuery;
    odataV3Options: OdataUiGrid.Base.IOdataUiGridQuery;
    list: any[];
    gridOptions: any;
  }

  export class TestAppController {
    public static $inject = ["$scope", "$odataresource", "uiGridConstants"];

    constructor($scope: ITestAppScope, $odataresource: OData.IResourceService, uiGridConstants: uiGrid.IUiGridConstants) {
      $scope.odataV4Options = <OdataUiGrid.Base.IOdataUiGridQuery>{
        resource: $odataresource("http://services.odata.org/V4/Northwind/Northwind.svc/Orders")
      };
      $scope.odataV3Options = <OdataUiGrid.Base.IOdataUiGridQuery>{
        resource: $odataresource("http://services.odata.org/Northwind/Northwind.svc/Orders")
      };
      $scope.list = [];
      $scope.gridOptions = {
        data: "list",
        totalItems: 20,
        enableSorting: true,
        enableFiltering: true,
        enableRowSelection: false,
        columnDefs: [
          {
            field: "OrderID",
            filter: {
              condition: uiGridConstants.filter.GREATER_THAN_OR_EQUAL,
              placeholder: "Greater than or equal"
            }
          },
          {
            field: "EmployeeID",
            filter: {
              condition: uiGridConstants.filter.EXACT,
              placeholder: "Exact"
            }
          },
          {
            field: "CustomerID",
            filter: {
              condition: uiGridConstants.filter.STARTS_WITH,
              placeholder: "Starts with"
            }
          },
          {
            field: "Freight",
            filter: {
              condition: uiGridConstants.filter.GREATER_THAN,
              placeholder: "Greater than"
            }
          },
          {
            field: "ShipName",
            filter: {
              condition: uiGridConstants.filter.ENDS_WITH,
              placeholder: "Ends with"
            }
          },
          {
            field: "ShipCity",
            filter: {
              condition: uiGridConstants.filter.CONTAINS,
              placeholder: "Contains"
            }
          },
          {
            field: "ShipName",
            filter: {
              condition: uiGridConstants.filter.CONTAINS,
              placeholder: "Contains"
            }
          },
          {
            field: "ShipName",
            filter: {
              condition: uiGridConstants.filter.CONTAINS,
              placeholder: "Contains"
            }
          },
          {
            field: "OrderDate",
            filters: [
              {
                type: "date",
                condition: uiGridConstants.filter.GREATER_THAN_OR_EQUAL,
                placeholder: "From"
              },
              {
                type: "date",
                condition: uiGridConstants.filter.LESS_THAN_OR_EQUAL,
                placeholder: "To"
              }
            ]
          }
        ]
      };
    }
  };

  TestApp.Modules.testApp.controller("testAppController", ["$scope", "$odataresource", "uiGridConstants",
    ($scope: ITestAppScope, $odataresource: OData.IResourceService,
      uiGridConstants: uiGrid.IUiGridConstants): TestAppController =>
      new TestAppController($scope, $odataresource, uiGridConstants)
  ]);
}
