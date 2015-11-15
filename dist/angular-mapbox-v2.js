(function() {
  'use strict';

  angular.module('angular-mapbox-v2', []);
})();

(function()
{
    'use strict';

    angular.module('angular-mapbox-v2').service('mapboxService', [
        'utils',

        function(utils)
        {
            var _mapInstances = [],
                _markers = [],
                _mapOptions = [];

            function init(opts)
            {
                opts = opts ||
                {};
                L.mapbox.accessToken = opts.accessToken;
            }

            function addMapInstance(map, mapOptions, mapMarkers)
            {
                mapOptions = mapOptions ||
                {};

                _mapInstances.push(map);
                _mapOptions.push(mapOptions);
                _markers.push(mapMarkers || []);
            }

            function removeMapInstance(map)
            {
                var mapIndex = _mapInstances.indexOf(map);

                if (mapIndex >= 0)
                {
                    _mapInstances.splice(mapIndex, 1);
                    _mapOptions.splice(mapIndex, 1);
                    _markers.splice(mapIndex, 1);
                }
            }

            function getMapInstances()
            {
                return _mapInstances;
            }

            function getMarkersForMap(map)
            {
                var mapIndex = _mapInstances.indexOf(map);
                return _markers[mapIndex];
            }

            function getOptionsForMap(map)
            {
                var mapIndex = _mapInstances.indexOf(map);
                return _mapOptions[mapIndex];
            }

            var fitMapToMarkers = utils.debounce(function(map)
            {
                var group = new L.featureGroup(getMarkersForMap(map));
                map.fitBounds(group.getBounds());
            }, 0);

            function addMarker(map, marker)
            {
                var mapIndex = _mapInstances.indexOf(map);
                var mapMarkers = _markers[mapIndex];
                var mapOptions = _mapOptions[mapIndex];

                mapMarkers.push(marker);

                if (mapOptions.scaleToFit)
                {
                    fitMapToMarkers(map);
                }
            }

            function removeMarker(map, marker)
            {
                map.removeLayer(marker);

                var markerIndexToRemove;
                for (var i = 0, markers = getMarkersForMap(map); markers[i]; i++)
                {
                    if (markers[i]._leaflet_id === marker._leaflet_id)
                    {
                        markerIndexToRemove = i;
                    }
                }

                markers.splice(markerIndexToRemove, 1);

                var opts = getOptionsForMap(map);
                if (opts.scaleToFit && opts.scaleToFitAll)
                {
                    fitMapToMarkers(map);
                }
            }

            return {
                init: init,
                getMapInstances: getMapInstances,
                addMapInstance: addMapInstance,
                removeMapInstance: removeMapInstance,
                getMarkersForMap: getMarkersForMap,
                addMarker: addMarker,
                removeMarker: removeMarker,
                fitMapToMarkers: fitMapToMarkers,
                getOptionsForMap: getOptionsForMap
            };
        }
    ]);

})();

(function()
{
    'use strict';

    angular.module('angular-mapbox-v2')
        .constant('utils',
        {
            debounce: function(func, wait, immediate)
            {
                var timeout;

                return function()
                {
                    var context = this,
                        args = arguments;

                    var later = function()
                    {
                        timeout = null;
                        if (!immediate)
                        {
                            func.apply(context, args);
                        }
                    };

                    var callNow = immediate && !timeout;
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);

                    if (callNow)
                    {
                        func.apply(context, args);
                    }
                };
            }
        });
})();

(function()
{
    'use strict';

    angular.module('angular-mapbox-v2').directive('featureLayer', function()
    {
        return {
            restrict: 'E',
            require: '^mapbox',
            link: function(scope, element, attrs, controller)
            {
                var featureLayer;

                controller.getMap().then(function(map)
                {
                    if (attrs.data)
                    {
                        var geojsonObject = scope.$eval(attrs.data);
                        featureLayer = L.mapbox.featureLayer(geojsonObject);
                    }
                    else if (attrs.url)
                    {
                        featureLayer = L.mapbox.featureLayer(attrs.url);
                    }

                    if (featureLayer)
                    {
                        featureLayer.addTo(map);
                        controller.addFeatureLayer(featureLayer);

                        element.bind('$destroy', function()
                        {
                            map.removeLayer(featureLayer);
                            controller.removeFeatureLayer(featureLayer);
                        });
                    }
                });
            }
        };
    });
})();

(function()
{
    'use strict';

    angular.module('angular-mapbox-v2').directive('htmlMarker', function($compile, $timeout, mapboxService)
    {
        var _colors = {
            navy: '#001f3f',
            blue: '#0074d9',
            aqua: '#7fdbff',
            teal: '#39cccc',
            olive: '#3d9970',
            green: '#2ecc40',
            lime: '#01ff70',
            yellow: '#ffdc00',
            orange: '#ff851b',
            red: '#ff4136',
            fuchsia: '#f012be',
            purple: '#b10dc9',
            maroon: '#85144b',
            white: 'white',
            silver: '#dddddd',
            gray: '#aaaaaa',
            black: '#111111'
        };

        return {
            restrict: 'E',
            require: '^mapbox',
            transclude: true,
            scope: true,
            link: link
        };

        function link(scope, element, attrs, controller, transclude)
        {
            var _marker, _opts, _style;

            _opts = {
                draggable: attrs.draggable !== undefined,
                className: attrs.className,
                html: attrs.html,
                width: attrs.width,
                height: attrs.height
            };

            _style = setStyleOptions(attrs);

            controller.getMap().then(function(map)
            {
                transclude(scope, function(transcludedContent)
                {
                    var popupContentElement;

                    if (transcludedContent !== null && transcludedContent.length > 0)
                    {
                        popupContentElement = document.createElement('span');

                        for (var i = 0; i < transcludedContent.length; i++)
                        {
                            popupContentElement.appendChild(transcludedContent[i]);
                        }
                    }

                    if (attrs.currentLocation !== undefined)
                    {
                        _style = setStyleOptions(_style,
                        {
                            'marker-color': '#000',
                            'marker-symbol': 'star'
                        });
                        _opts.excludeFromClustering = true;

                        map.on('locationfound', function(e)
                        {
                            _marker = addMarker(scope, map, [e.latlng.lat, e.latlng.lng], popupContentElement, _opts, _style);
                        });

                        map.locate();
                    }
                    else
                    {
                        _marker = addMarker(scope, map, [attrs.lat, attrs.lng], popupContentElement, _opts, _style);
                    }
                });

                var refreshMarker = function()
                {
                    _marker.setLatLng([attrs.lat, attrs.lng]);
                };

                attrs.$observe('lat', refreshMarker);
                attrs.$observe('lng', refreshMarker);

                element.bind('$destroy', function()
                {
                    if (mapboxService.getOptionsForMap(map).clusterMarkers)
                    {
                        scope.clusterGroup.removeLayer(_marker);
                    }
                    else
                    {
                        mapboxService.removeMarker(map, _marker);
                    }
                });
            });
        }

        function setStyleOptions(attrs, defaultOpts)
        {
            var opts = defaultOpts ||
            {};

            if (attrs.size)
            {
                opts['marker-size'] = attrs.size;
            }

            if (attrs.color)
            {
                if (attrs.color[0] === '#')
                {
                    opts['marker-color'] = attrs.color;
                }
                else
                {
                    opts['marker-color'] = _colors[attrs.color] || attrs.color;
                }
            }

            if (attrs.icon)
            {
                opts['marker-symbol'] = attrs.icon;
            }

            return opts;
        }

        function addMarker(scope, map, latlng, popupContent, opts)
        {
            opts = opts ||
            {};

            var marker = L.marker(latlng,
            {
                icon: L.divIcon(
                {
                    className: opts.className,
                    html: opts.html,
                    iconSize: opts.width && opts.height ? [opts.width, opts.height] : null
                })
            });

            if (popupContent)
            {
                marker.bindPopup(popupContent);
            }

            if (mapboxService.getOptionsForMap(map).clusterMarkers && opts.excludeFromClustering !== true)
            {
                scope.clusterGroup.addLayer(marker);
            }
            else
            {
                marker.addTo(map);
            }

            // this needs to come after being added to map because the L.mapbox.marker.style() factory
            // does not let us pass other opts (eg, draggable) in
            if (opts.draggable)
            {
                marker.dragging.enable();
            }

            mapboxService.addMarker(map, marker);

            return marker;
        }
    });
})();

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
                scope:
                {
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
                                $scope.onReposition(
                                {
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
                                $scope.onZoom(
                                {
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
                                $scope.onClick(
                                {
                                    event: event,
                                    map: $scope.map
                                });
                            });
                        });
                    }

                    var refreshMap = function()
                    {
                        var zoom = attrs.zoom || 12;

                        if (attrs.lat && attrs.lng)
                        {
                            $scope.map.setView([attrs.lat, attrs.lng], zoom);
                        }
                        else
                        {
                            $scope.map.setZoom(zoom);
                        }
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

(function()
{
    'use strict';

    angular.module('angular-mapbox-v2').directive('marker', function($compile, $timeout, $parse, mapboxService)
    {
        var _colors = {
            navy: '#001f3f',
            blue: '#0074d9',
            aqua: '#7fdbff',
            teal: '#39cccc',
            olive: '#3d9970',
            green: '#2ecc40',
            lime: '#01ff70',
            yellow: '#ffdc00',
            orange: '#ff851b',
            red: '#ff4136',
            fuchsia: '#f012be',
            purple: '#b10dc9',
            maroon: '#85144b',
            white: 'white',
            silver: '#dddddd',
            gray: '#aaaaaa',
            black: '#111111'
        };

        return {
            restrict: 'E',
            require: '^mapbox',
            transclude: true,
            scope: true,
            link: link
        };

        function link(scope, element, attrs, controller, transclude)
        {
            var _marker, _opts, _style;

            _opts = {
                draggable: attrs.draggable !== undefined
            };
            _style = setStyleOptions(attrs);

            controller.getMap().then(function(map)
            {
                transclude(scope, function(transcludedContent)
                {
                    var popupContentElement;
                    if (transcludedContent !== null && transcludedContent.length > 0)
                    {
                        popupContentElement = document.createElement('span');
                        for (var i = 0; i < transcludedContent.length; i++)
                        {
                            popupContentElement.appendChild(transcludedContent[i]);
                        }
                    }

                    if (attrs.currentLocation !== undefined)
                    {
                        _style = setStyleOptions(_style,
                        {
                            'marker-color': '#000',
                            'marker-symbol': 'star'
                        });
                        _opts.excludeFromClustering = true;

                        map.on('locationfound', function(e)
                        {
                            _marker = addMarker(scope, map, [e.latlng.lat, e.latlng.lng], popupContentElement, _opts, _style);
                        });

                        map.locate();
                    }
                    else
                    {
                        _marker = addMarker(scope, map, [attrs.lat, attrs.lng], popupContentElement, _opts, _style);

                        if (attrs.onClick)
                        {
                            var clickFn = $parse(attrs.onClick, null, true);
                            _marker.on('click', function()
                            {
                                scope.$apply(function()
                                {
                                    clickFn(scope,
                                    {
                                        $event: event
                                    });
                                });
                            });
                        }
                    }
                });

                element.bind('$destroy', function()
                {
                    if (mapboxService.getOptionsForMap(map).clusterMarkers)
                    {
                        scope.clusterGroup.removeLayer(_marker);
                    }
                    else
                    {
                        mapboxService.removeMarker(map, _marker);
                    }
                });
            });
        }

        function setStyleOptions(attrs, defaultOpts)
        {
            var opts = defaultOpts ||
            {};

            if (attrs.size)
            {
                opts['marker-size'] = attrs.size;
            }

            if (attrs.color)
            {
                if (attrs.color[0] === '#')
                {
                    opts['marker-color'] = attrs.color;
                }
                else
                {
                    opts['marker-color'] = _colors[attrs.color] || attrs.color;
                }
            }

            if (attrs.icon)
            {
                opts['marker-symbol'] = attrs.icon;
            }

            return opts;
        }

        function addMarker(scope, map, latlng, popupContent, opts, style)
        {
            opts = opts ||
            {};

            var marker = L.mapbox.marker.style(
            {
                properties: style
            }, latlng);
            if (popupContent)
            {
                marker.bindPopup(popupContent);
            }

            if (mapboxService.getOptionsForMap(map).clusterMarkers && opts.excludeFromClustering !== true)
            {
                scope.clusterGroup.addLayer(marker);
            }
            else
            {
                marker.addTo(map);
            }

            // this needs to come after being added to map because the L.mapbox.marker.style() factory
            // does not let us pass other opts (eg, draggable) in
            if (opts.draggable)
            {
                marker.dragging.enable();
            }

            mapboxService.addMarker(marker);

            return marker;
        }
    });
})();
