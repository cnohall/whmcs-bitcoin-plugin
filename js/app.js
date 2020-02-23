service = angular.module("shoppingcart.services", ["ngResource"]);

service.factory('Order', function($resource) {
    param = {};
    var item = $resource(window.location.pathname, param);
    return item;
});

app = angular.module('shopping-cart-demo', ["monospaced.qrcode", "shoppingcart.services"],function($interpolateProvider) {
            $interpolateProvider.startSymbol('[[');
            $interpolateProvider.endSymbol(']]');
});

app.config(function($compileProvider) {
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|data|chrome-extension|bitcoin|bitcoincash):/);
    // Angular before v1.2 uses $compileProvider.urlSanitizationWhitelist(...)
});

function getParameterByNameBlocko(name, url) {
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

//CheckoutController
app.controller('CheckoutController', function($scope, $interval, Order, $httpParamSerializer, $timeout, AltcoinNew, AltcoinAccept, AltcoinLimits, InternalApi) {
    //get order id from url
    var btcAddressDiv = document.getElementById("btc-address");
	$scope.address = btcAddressDiv.dataset.address;
	var timePeriodDiv = document.getElementById("time-period");
	blockonomics_time_period = timePeriodDiv.dataset.timeperiod;
    var currencyDiv = document.getElementById("currency");
    $scope.currency = currencyDiv.dataset.currency;
    var totalProgress = 100;
    $scope.copyshow = false;
    //blockonomics_time_period is defined on JS file as global var
    var totalTime = blockonomics_time_period * 60;
    $scope.display_problems = true;
    //Create url when the order is received 
    $scope.finish_order_url = function() {
        var params = {};
        params.finish_order = $scope.address;
        url = window.location.pathname;
        var serializedParams = $httpParamSerializer(params);
        if (serializedParams.length > 0) {
            url += ((url.indexOf('?') === -1) ? '?' : '&') + serializedParams;
        }
        return url;
    }

    //Create url for altcoin payment
    $scope.alt_track_url = function(uuid) {
        var params = {};
        params.uuid = uuid;
        url = window.location.pathname;
        var serializedParams = $httpParamSerializer(params);
        if (serializedParams.length > 0) {
            url += ((url.indexOf('?') === -1) ? '?' : '&') + serializedParams;
        }
        return url;
    }

    //Increment bitcoin timer 
    $scope.tick = function() {
        $scope.clock = $scope.clock - 1;
        $scope.progress = Math.floor($scope.clock * totalProgress / totalTime);
        if ($scope.clock < 0) {
            $scope.clock = 0;
            //Order expired
            $scope.order.status = -3;
        }
        $scope.progress = Math.floor($scope.clock * totalProgress / totalTime);
    };

    //Select Blockonomics currency
    $scope.select_blockonomics_currency = function(blockonomics_currency) {
        $scope.currency_selecter  = false;
        for (var i = $scope.active_currencies.length - 1; i >= 0; i--) {
            if($scope.active_currencies[i].code == blockonomics_currency){
                $scope.currency = $scope.active_currencies[i];
                check_blockonomics_hash();
            }
        }
    }

    //Fetch the blockonomics_currency symbol from name
    function getAltKeyByValue(object, value) {
        return Object.keys(object).find(key => object[key] === value);
    }

    //Proccess the order data
    function proccess_order_data(data) {
        $scope.order = data;
        if(data.blockonomics_currency == 'btc'){
            var subdomain = 'www';
        }else{
            var subdomain = data.blockonomics_currency;
        }
        //Check the status of the order
        if ($scope.order.status == -1) {
            $scope.clock = $scope.order.timestamp + totalTime - Math.floor(Date.now() / 1000);
            //Mark order as expired if we ran out of time
            if ($scope.clock < 0) {
                $scope.order.status = -3;
                return;
            }
            $scope.tick_interval = $interval($scope.tick, 1000);
            //Connect and Listen on websocket for payment notification
            var ws = new ReconnectingWebSocket("wss://" + subdomain + ".blockonomics.co/payment/" + $scope.order.addr + "?timestamp=" + $scope.order.timestamp);
            ws.onmessage = function(evt) {
                ws.close();
                $interval(function() {
                    //Redirect to order received page if message from socket
                    window.location = $scope.finish_order_url();
                //Wait for 2 seconds for order status to update on server
                }, 2000, 1);
            }
        }
    }
    
    //Check if the blockonomics hash is present
    function check_blockonomics_hash() {
        $scope.spinner = true;
        if (typeof $scope.order_hash != 'undefined') {
            //Fetch the order using hash
            Order.get({
                "get_order": $scope.order_hash,
                "blockonomics_currency": $scope.currency.code
            }, function(data) {
                proccess_order_data(data);
                $scope.spinner = false;
                $scope.checkout_panel  = true;
            });
        }
    }
    
    $scope.spinner = true;
    if(Object.keys($scope.active_currencies).length == 1){
        // Auto select currency if 1 activated currency
        $scope.currency = $scope.active_currencies[0];
        check_blockonomics_hash();
    }else if(Object.keys($scope.active_currencies).length >= 1){
        //Show user currency selector if > 1 activated currency
        $scope.currency_selecter  = true;
        $scope.spinner = false;
    }
    
    //Copy bitcoin address to clipboard
    $scope.blockonomics_address_click = function() {
        var copyText = document.getElementById("bnomics-address-copy");
        copyText.select();
        document.execCommand("copy");
        //Open copy clipboard message
        $scope.address_copyshow = true;
        $timeout(function() {
            $scope.address_copyshow = false;
        //Close copy to clipboard message after 2 sec
        }, 2000);
    }

    //Copy bitcoin amount to clipboard
    $scope.blockonomics_amount_click = function() {
        var copyText = document.getElementById("bnomics-amount-copy");
        copyText.innerHTML.select();
        document.execCommand("copy");
        //Open copy clipboard message
        $scope.amount_copyshow = true;
        $timeout(function() {
            $scope.amount_copyshow = false;
        //Close copy to clipboard message after 2 sec
        }, 2000);
    }
    //Copy bitcoin address to clipboard
    $scope.try_again_click = function() {
        location.reload();
    }

});
