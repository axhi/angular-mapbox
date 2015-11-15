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
