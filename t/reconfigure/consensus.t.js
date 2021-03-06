require('proof')(7, require('cadence')(prove))
function prove (async, assert) {
    var Consensus = require('../../reconfigure/consensus')
    var exec = require('child_process').exec
    var abend = require('abend')
    var ip
    if (process.env.DOCKER_HOST) {
        ip = /^[^\d]+([\d.]+)/.exec(process.env.DOCKER_HOST)[1]
    } else {
        var interfaces = require('os').networkInterfaces()

        ip = [].concat.apply([],
                Object.keys(interfaces).map(function (key) { return interfaces[key] }))
            .filter(function (iface) {
                return iface.internal ? false : iface.family == 'IPv4'
            })[0].address
    }
    console.log('Using IPv4 address: ', ip)
    async([function () {
        async(function () {
            exec('docker kill reconfigure-etcd', async())
        }, function () {
            exec('docker rm reconfigure-etcd', async())
        })
    }], function () {
        exec('docker run -d -p 4001:4001 -p 2380:2380 -p 2379:2379 \
             --name reconfigure-etcd quay.io/coreos/etcd \
             -name reconfigure-etcd \
             -advertise-client-urls http://' + ip + ':2379,http://' + ip + ':4001 \
             -listen-client-urls http://0.0.0.0:2379,http://0.0.0.0:4001 \
             -initial-advertise-peer-urls http://' + ip + ':2380 \
             -listen-peer-urls http://0.0.0.0:2380 \
             -initial-cluster-token etcd-cluster-1 \
             -initial-cluster reconfigure-etcd=http://' + ip + ':2380 \
             -initial-cluster-state new', async())
    }, function () {
        var wait, consensus = new Consensus('test', ip, '2379', function (e, callback) {
            assert(true, 'listener called')
            callback()
            wait()
        })
        async(function () {
            consensus.stop()
            consensus.initialize(async())
        }, function () {
            consensus.initialize(async())
        }, function () {
            consensus.addListener('http://127.0.0.1:9998', async())
        }, function () {
            consensus.listeners(async())
        }, function (list) {
            assert(list, ['http://127.0.0.1:9998'], 'listener added')
        }, function () {
            consensus.addListener('http://127.0.0.1:9998', async())
        }, function () {
            consensus.listeners(async())
        }, function (list) {
            assert(list, ['http://127.0.0.1:9998'], 'duplicate prevented')
        }, function () {
            consensus.removeListener('http://127.0.0.1:9998', async())
        }, function () {
            consensus.listeners(async())
        }, function (list) {
            assert(list, [], 'listener removed')
        }, function () {
            consensus.set('foo', 'bar', async())
            consensus.set('fro', 'bar', async())
            consensus.set('frr', 'bar', async())
            consensus.set('for', 'bar', async())
        }, function (set) {
            assert(set.node.key, '/reconfigure/properties/foo', 'key set')
        }, function () {
            async(function () {
                consensus.list(async())
            }, function (list) {
                assert(list, {'foo':'bar','fro':'bar','frr':'bar','for':'bar'}, 'list ok')
            }, function () {
                consensus.watch(abend)
                setTimeout(async(), 2500)
            }, function () {
                async(function () {
                    wait = async()
                    consensus.set('foo', 'blat', async()) // can't truly `watch` and `set`
                                                          // at the same time. this
                                                          // just ensures
                                                          // consensus._list is
                                                          // updated.
                }, function () {
                    consensus.list(async())
                })
            }, function (list) {
                assert(list, {'foo':'blat','fro':'bar','frr':'bar','for':'bar'}, 'list updated')
                consensus.stop()
            })
        })
    })
}
