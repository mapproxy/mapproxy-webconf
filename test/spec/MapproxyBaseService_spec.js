/*
    Cause MapproxySources, MapproxyCaches and MapproxyGrids all use MapproxyBaseService
    only MapproxySources is tested.
*/

describe('MapproxySources', function() {
    var $httpBackend, scope, service;

    beforeEach(function() {
        module('mapproxy_gui.resources');
        module('mapproxy_gui.services');
    });

    beforeEach(inject(function($rootScope, $injector) {
        scope = $rootScope;
        $httpBackend = $injector.get('$httpBackend');
        $httpBackend.expectGET('/conf/base/sources');
        $httpBackend.whenGET('/conf/base/sources')
            .respond({
                "1": {
                    "req": {
                        "url": "http://www.example.org/proxy/service?",
                        "layers": ["foo"]
                    },
                    "type": "wms",
                    "name": "test",
                    "_id": 1
                },
                "2": {
                    "req": {
                        "url": "http://www.example.org/service?",
                        "layers": ["bar"]
                    },
                    "type": "wms",
                    "name": "test2",
                    "_id": 2
                }
            });
    }));

    afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

    it('should fetch sources from server and provide resource for each fetched source in a list', inject(function(MapproxySources, MapproxyResource) {
        $httpBackend.flush()
        expect(MapproxySources.list()).toEqual([
            new MapproxyResource({
                "req": {
                    "url": "http://www.example.org/proxy/service?",
                    "layers": ["foo"]
                },
                "type": "wms",
                "name": "test",
                "_id": 1
            }),
            new MapproxyResource({
                "req": {
                    "url": "http://www.example.org/service?",
                    "layers": ["bar"]
                },
                "type": "wms",
                "name": "test2",
                "_id": 2
            })
        ]);
    }));

    it('should remove the secound source', inject(function(MapproxySources, MapproxyResource) {
        $httpBackend.expectDELETE('/conf/base/sources/2').respond();
        var to_delete = new MapproxyResource({
            "req": {
                "url": "http://www.example.org/service?",
                "layers": ["bar"]
            },
            "type": "wms",
            "name": "test2",
            "_id": 2
        });
        MapproxySources.remove(to_delete)
        $httpBackend.flush()
    }));

    it('should add a new source', inject(function(MapproxySources, MapproxyResource) {
        var new_data = {
            "req": {
                "url": "http://www2.example.org/service?",
                "layers": ["foobar"]
            },
            "type": "wms",
            "name": "foobar"
        };
        var return_data = angular.copy(new_data);
        return_data['_id'] = 3;

        $httpBackend.expectPOST('/conf/base/sources').respond(return_data)
        MapproxySources.add(new_data);
        $httpBackend.flush()
        expect(MapproxySources.byId(3).name).toEqual("foobar")
    }));
});