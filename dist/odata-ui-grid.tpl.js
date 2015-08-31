;(function(){

'use strict';

angular.module('odata.ui.grid').run(['$templateCache', function($templateCache) {

  $templateCache.put('lib/directives/odataUiGridFilterView.html', '<div class="ui-grid-filter-container" ng-repeat="colFilter in col.filters" ng-class="{\'ui-grid-filter-cancel-button-hidden\' : colFilter.disableCancelFilterButton === true }"></div>');

}]);

})();