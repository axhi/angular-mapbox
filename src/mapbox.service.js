(function()
{
    'use strict';

    angular.module('angular-mapbox').service('mapboxService', [
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
