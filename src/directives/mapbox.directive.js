(function()
{
    'use strict';

    angular.module('angular-mapbox-v2').directive('mapbox', ['$q', '$parse', '$timeout', 'mapboxService',
        function($q, $parse, $timeout, mapboxService)
        {
            var _mapboxMap;

            return {
                restrict: 'E',
                transclude: true,
                scope: {
                    onReposition: '&?',
                    onZoom: '&?',
                    onClick: '&?'
                },
                replace: true,
                template: '<div class="angular-mapbox-map" ng-transclude></div>',
                controller: function($scope)
                {
                    _mapboxMap = $q.defer();

                    this.getMap = function()
                    {
                        return _mapboxMap.promise;
                    };

                    this.addFeatureLayer = function(featureLayer)
                    {
                        $scope.featureLayers.push(featureLayer);
                    };

                    this.removeFeatureLayer = function(featureLayer)
                    {
                        $scope.featureLayers.slice($scope.featureLayers.indexOf(featureLayer), 1);
                    };

                    if (L.MarkerClusterGroup)
                    {
                        $scope.clusterGroup = new L.MarkerClusterGroup();
                        this.getMap().then(function(map)
                        {
                            map.addLayer($scope.clusterGroup);
                        });
                    }

                    this.$scope = $scope;
                },
                link: function($scope, element, attrs)
                {
                    $scope.map = L.mapbox.map(element[0], attrs.mapId);
                    $scope.markers = [];
                    $scope.featureLayers = [];

                    var mapOptions = {
                        clusterMarkers: attrs.clusterMarkers !== undefined,
                        scaleToFit: attrs.scaleToFit !== undefined,
                        scaleToFitAll: attrs.scaleToFit === 'all'
                    };

                    mapboxService.addMapInstance($scope.map, mapOptions, $scope.markers);
                    _mapboxMap.resolve($scope.map);

                    if (attrs.dragging === 'false')
                    {
                        $scope.map.dragging.disable();
                    }
                    if (attrs.touchZoom === 'false')
                    {
                        $scope.map.touchZoom.disable();
                    }
                    if (attrs.doubleClickZoom === 'false')
                    {
                        $scope.map.doubleClickZoom.disable();
                    }
                    if (attrs.scrollWheelZoom === 'false')
                    {
                        $scope.map.scrollWheelZoom.disable();
                    }

                    if (attrs.autoSize === undefined)
                    {
                        var mapWidth = attrs.width || 500;
                        var mapHeight = attrs.height || 500;

                        if (isNaN(mapWidth))
                        {
                            element.css('width', mapWidth);
                        }
                        else
                        {
                            element.css('width', mapWidth + 'px');
                        }

                        if (isNaN(mapHeight))
                        {
                            element.css('height', mapHeight);
                        }
                        else
                        {
                            element.css('height', mapHeight + 'px');
                        }
                    }

                    if ($scope.onReposition)
                    {
                        $scope.map.on('dragend', function(event)
                        {
                            $timeout(function()
                            {
                                $scope.onReposition({
                                    event: event,
                                    map: $scope.map
                                });
                            });
                        });
                    }

                    if ($scope.onZoom)
                    {
                        $scope.map.on('zoomend', function(event)
                        {
                            $timeout(function()
                            {
                                $scope.onZoom({
                                    event: event,
                                    map: $scope.map
                                });
                            });
                        });
                    }

                    if ($scope.onClick)
                    {
                        $scope.map.on('click', function(event)
                        {
                            $timeout(function()
                            {
                                $scope.onClick({
                                    event: event,
                                    map: $scope.map
                                });
                            });
                        });
                    }

                    var refreshMap = function()
                    {
                        var zoom = attrs.zoom || 12;

                        if (!attrs.lat || !attrs.lng)
                            return;

                        $scope.map.setView([attrs.lat, attrs.lng], zoom);
                    };

                    attrs.$observe('lat', refreshMap);
                    attrs.$observe('lng', refreshMap);
                    attrs.$observe('zoom', refreshMap);

                    element.bind('$destroy', function()
                    {
                        mapboxService.removeMapInstance($scope.map);
                    });

                    refreshMap();
                },
            };
        }
    ]);
})();
