angular.module('angular-mapbox', [])
  .service('mapboxService', ['$timeout', function($timeout) {
    var _mapInstances = {};

    function init(opts) {
      opts = opts ||
        {};
      L.mapbox.accessToken = opts.accessToken;
    }

    function _addMapInstance(map, mapOptions, mapMarkers)
    {
      mapOptions = mapOptions || {};

      this.mapInstances[getMapId(map)] = {
        map: map,
        options: mapOptions,
        markers: mapMarkers
      }
    }

    function getMapId(map) {
      return map._container.id;
    }

    function _removeMapInstance(map) {
      delete this.mapInstances[getMapId(map)]
    }

    function _getMapInstances() {
      return this.mapInstances;
    }

    function _getMapInstance(id) {
      return this.mapInstances[id].map;
    }

    function _getMarkersForMap(map) {
      if (!this.mapInstances[getMapId(map)]) return;
      return this.mapInstances[getMapId(map)].markers;
    }

    function _getOptionsForMap(map) {
      if (!this.mapInstances[getMapId(map)]) return;
      return this.mapInstances[getMapId(map)].options;
    }

    function _fitMapToMarkers (map, markers) {
      $timeout(function() {
        var group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds());
        if (map.getZoom() > 15) map.setZoom(15);
      }.bind(this), 200);
    };

    function _addMarker(map, marker) {
      var mapInstance = this.mapInstances[getMapId(map)];
      var mapMarkers = mapInstance.markers;
      var mapOptions = mapInstance.options;

      mapMarkers.push(marker);
      this.mapInstances[getMapId(map)].markers = mapMarkers;

      if (mapOptions.scaleToFit)
      {
        this.fitMapToMarkers(map, mapMarkers);
      }
    }

    function _removeMarker(map, marker) {
      var markerIndexToRemove;
      var markers = this.getMarkersForMap(map);
      if (!markers) return;
      var opts = this.getOptionsForMap(map);
      var cG = opts.clusterGroup;

      if (opts.clusterMarkers) {
        cG.removeLayer(marker);
        return;
      };

      map.removeLayer(marker);
      for (var i = 0; markers[i]; i++) {
        if (markers[i]._leaflet_id === marker._leaflet_id) {
          markerIndexToRemove = i;
        }
      }

      markers.splice(markerIndexToRemove, 1);
      if (opts.scaleToFit && opts.scaleToFitAll)
      {
        this.fitMapToMarkers(map, markers);
      }
      this.mapInstances[getMapId(map)].markers = markers;
    }

    function _removeMarkers(map) {
      var mapInstance = this.mapInstances[getMapId(map)];
      var cG = mapInstance.options.clusterGroup;

      if (cG) {
        map.removeLayer(cG);
        this.mapInstances[getMapId(map)].options.clusterGroup = new L.MarkerClusterGroup({disableClusteringAtZoom: 18});
        map.addLayer(this.mapInstances[getMapId(map)].options.clusterGroup);
      };
    }

    return {
      init: init,
      getMapInstances: _getMapInstances,
      addMapInstance: _addMapInstance,
      removeMapInstance: _removeMapInstance,
      getMarkersForMap: _getMarkersForMap,
      addMarker: _addMarker,
      removeMarker: _removeMarker,
      fitMapToMarkers: _fitMapToMarkers,
      getOptionsForMap: _getOptionsForMap,
      getMapInstance: _getMapInstance,
      mapInstances: _mapInstances,
    };
  }
  ])

  .directive('mapbox', ['$q', '$parse', '$timeout', 'mapboxService',
    function($q, $parse, $timeout, mapboxService)
    {
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
            mapOptions.clusterGroup = new L.MarkerClusterGroup({
              disableClusteringAtZoom: 18,
              removeOutsideVisibleBounds: true,
              showCoverageOnHover: false,
            });
            $scope.map.featureLayer.on('ready', function (e) {
              e.target.eachLayer(function(layer) {
                mapOptions.clusterGroup.addLayer(layer);
              });
            });
            $scope.map.addLayer(mapOptions.clusterGroup);
          };

          mapboxService.addMapInstance($scope.map, mapOptions, $scope.markers);

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
  ])

  .directive('marker', ['$compile', '$timeout', 'mapboxService',
    function($compile, $timeout, mapboxService) {
      return {
        restrict: 'E',
        scope: {
          onClick: '&',
          marker: '='
        },
        link: function(scope, element, attrs) {
          var _marker, _opts;
          _opts = {
            draggable: attrs.draggable !== undefined,
            clickable: attrs.clickable !== undefined,
            icon: getIcon(attrs),
            bounceOnAdd: attrs.bounce !== undefined,
            bounceOnAddOptions: {
              duration: 600,
              height: -.5
            }
          };

          function getIcon (attrs) {
            if (attrs.iconUrl) {
              return L.icon({
                iconUrl: attrs.iconUrl,
                iconSize: attrs.iconSize.split(','),
                iconAnchor: [20, 30]
              });
            } else {
              return L.icon();
            }
          };

          var map = mapboxService.getMapInstance(attrs.id);
          _marker = addMarker(scope, map, [attrs.lat, attrs.lng], _opts);

          if (scope.onClick) {
            _marker.on('click', function () {
              scope.onClick({marker: scope.marker});
            });
          }

          element.bind('$destroy', function() {
            if (mapboxService.getOptionsForMap(map) && mapboxService.getOptionsForMap(map).clusterMarkers)
            {
              mapboxService.getOptionsForMap(map).clusterGroup.removeLayer(_marker);
            } else {
              mapboxService.removeMarker(map, _marker);
            }
          });

          function addMarker(scope, map, latlng, opts)
          {
            opts = opts ||
              {};

            var marker = L.marker(latlng, opts);

            if (mapboxService.getOptionsForMap(map).clusterMarkers && opts.excludeFromClustering !== true)
            {
              mapboxService.getOptionsForMap(map).clusterGroup.addLayer(marker);
            } else {
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
          };
        }
      }
    }
  ]);
