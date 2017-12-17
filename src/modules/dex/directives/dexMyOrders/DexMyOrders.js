(function () {
    'use strict';

    /**
     * @param Base
     * @param {Waves} waves
     * @param {User} user
     * @param createPoll
     * @param {NotificationManager} notificationManager
     * @return {DexMyOrders}
     */
    const controller = function (Base, waves, user, createPoll, notificationManager) {

        class DexMyOrders extends Base {

            constructor() {
                super();

                /**
                 * @type {string}
                 * @private
                 */
                this._amountAssetId = null;
                /**
                 * @type {string}
                 * @private
                 */
                this._priceAssetId = null;

                this.syncSettings({
                    _amountAssetId: 'dex.amountAssetId',
                    _priceAssetId: 'dex.priceAssetId'
                });

                const poll = createPoll(this, this._getOrders, 'orders', 5000);
                this.observe(['_amountAssetId', '_priceAssetId'], () => poll.restart());
            }

            dropOrder(order) {
                user.getSeed().then((seed) => {
                    waves.matcher.cancelOrder(order.amount.asset.id, order.price.asset.id, order.id, seed.keyPair)
                        .then(() => {
                            const canceledOrder = tsUtils.find(this.orders, { id: order.id });
                            canceledOrder.state = 'Canceled';
                            notificationManager.info({
                                ns: 'app.dex',
                                title: { literal: 'directives.myOrders.notifications.isCanceled' }
                            });
                        })
                        .catch(() => {
                            notificationManager.error({
                                ns: 'app.dex',
                                title: { literal: 'directives.myOrders.notifications.somethingWentWrong' }
                            });
                        });
                });
            }

            capitalize(type) {
                if (type === 'sell') return 'Sell';
                if (type === 'buy') return 'Buy';
            }

            _getOrders() {
                const asset1 = this._priceAssetId;
                const asset2 = this._amountAssetId;
                return Promise.all([user.getSeed(), Waves.AssetPair.get(asset1, asset2)])
                    .then(([seed, pair]) => waves.matcher.getOrdersByPair(pair.amountAsset.id, pair.priceAsset.id, seed.keyPair))
                    .then((orders) => {
                        const active = orders.filter(({ status }) => status === 'Accepted');
                        const filled = orders.filter(({ status }) => status === 'Filled');
                        const others = orders.filter(({ status }) => status !== 'Accepted' && status !== 'Filled');
                        return active.concat(filled).concat(others);
                    });
            }

        }

        return new DexMyOrders();
    };

    controller.$inject = ['Base', 'waves', 'user', 'createPoll', 'notificationManager'];

    angular.module('app.dex').component('wDexMyOrders', {
        bindings: {},
        templateUrl: 'modules/dex/directives/dexMyOrders/myOrders.html',
        controller
    });
})();
