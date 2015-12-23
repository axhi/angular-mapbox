(function() {
  'use strict';

  angular.module('angular-mapbox', []);
})();

(function()
{
  'use strict';

  angular.module('angular-mapbox').service('mapboxService', [
    'utils',

    function(utils)
    {
      var _mapInstances = [],
        _markers = [],
        _mapInstanceMapped = {},
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
        _mapInstanceMapped[getMapId(map)] = map;
      }

      function getMapId(map) {
        return map._container.id;
      }

      function removeMapInstance(map)
      {
        var mapIndex = _mapInstances.indexOf(map);
        delete _mapInstanceMapped[getMapId(map)];

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

      function getMapInstance(id) {
        return _mapInstanceMapped[id];
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
        if (map.getZoom() > 15) map.setZoom(15);
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
        var markers = getMarkersForMap(map);
        if (!markers) return;
        for (var i = 0; markers[i]; i++)
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
        getOptionsForMap: getOptionsForMap,
        getMapInstance: getMapInstance,
      };
    }
  ]);

})();

(function()
{
  'use strict';

  angular.module('angular-mapbox')
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

  angular.module('angular-mapbox').directive('featureLayer', function()
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

  angular.module('angular-mapbox').directive('mapbox', ['$q', '$parse', '$timeout', 'mapboxService',
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

          this.$scope = $scope;
        },
        link: function($scope, element, attrs)
        {
          var ele = element[0];
          ele.id = attrs.id;
          $scope.map = L.mapbox.map(ele, attrs.mapId);
          $scope.markers = [];
          $scope.featureLayers = [];

          var mapOptions = {
            clusterMarkers: attrs.clusterMarkers !== undefined,
            scaleToFit: attrs.scaleToFit !== undefined,
            scaleToFitAll: attrs.scaleToFit === 'all'
          };

          if (mapOptions['clusterMarkers'] !== undefined) {
            mapOptions.clusterGroup = new L.MarkerClusterGroup();
            $scope.map.addLayer(mapOptions.clusterGroup);
          }

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
            var mapWidth = attrs.width || '100';
            var mapHeight = attrs.height || 500;

            if (isNaN(mapWidth))
            {
              element.css('width', mapWidth);
            }
            else
            {
              element.css('width', mapWidth + '%');
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

  angular.module('angular-mapbox').directive('marker', function($compile, $timeout, mapboxService)
  {

    return {
      restrict: 'E',
      require: '^mapbox',
      transclude: true,
      scope: {
        onClick: '&',
        marker: '='
      },
      link: link
    };

    function link(scope, element, attrs, controller, transclude)
    {
      var _marker, _opts, _style;

      _opts = {
        draggable: attrs.draggable !== undefined,
        clickable: attrs.clickable !== undefined,
        icon: getIcon(attrs)
      };
      _style = setStyleOptions(attrs, _opts);

      function getIcon (attrs) {
        if (attrs.iconUrl) {
          return L.icon({
            iconUrl:attrs.iconUrl,
            iconSize:attrs.iconSize,
            iconAnchor: [25, 35]
          });
        }
      };

      var map = mapboxService.getMapInstance(attrs.id);
      transclude(scope, function(transcludedContent) {
        _marker = addMarker(scope, map, [attrs.lat, attrs.lng], _opts, _style);

        if (scope.onClick) {
          _marker.on('click', function () {
            scope.onClick({marker: scope.marker});
          });
        }
      });

      element.bind('$destroy', function() {
        if (mapboxService.getOptionsForMap(map) && mapboxService.getOptionsForMap(map).clusterMarkers) {
          mapboxService.getOptionsForMap(map).clusterGroup.removeLayer(_marker);
        } else {
          mapboxService.removeMarker(map, _marker);
        }
      });
    }

    function setStyleOptions(attrs, defaultOpts)
    {
      var opts = defaultOpts || {};

      if (attrs.size) {
        opts['marker-size'] = attrs.size || [25, 35];
      }

      if (attrs.icon) {
        opts['marker-symbol'] = attrs.icon;
        delete opts['icon'];
      }

      if (attrs.color) {
        opts['marker-color'] = attrs.color;
      }

      return opts;
    }

    function addMarker(scope, map, latlng, opts, style)
    {
      opts = opts ||
      {};

      var marker = L.marker(latlng, opts);

      if (mapboxService.getOptionsForMap(map).clusterMarkers && opts.excludeFromClustering !== true)
      {
        mapboxService.getOptionsForMap(map).clusterGroup.addLayer(marker);
      }
      else
      {
        marker.addTo(map);
      }

      if (opts.draggable)
      {
        marker.dragging.enable();
      }

      if (opts.clickable) {
        marker.options.clickable = false;
      }

      mapboxService.addMarker(map, marker);

      return marker;
    }
  });
})();

