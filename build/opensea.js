"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContract = exports.trackWalletsAssets = exports.getWalletsAssets = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = require("dotenv");
const _1 = require(".");
const _2 = require(".");
function getAdresseAsset(address) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const openseaUrl = 'https://api.opensea.io/api/v1/assets';
        let assets = [];
        let cursor = '';
        let error = false;
        //on boucle jusqu'a ce qu'il n'y ait plus d'erreur
        do {
            const response = yield axios_1.default.get(openseaUrl, {
                headers: {
                    'X-API-KEY': process.env.OPENSEA_API_KEY
                },
                params: {
                    owner: address,
                    limit: 200,
                    cursor: cursor,
                }
            })
                .catch((error) => __awaiter(this, void 0, void 0, function* () {
                console.log("Erreur lors de la requete de récupération des assets, owner: " + address + ", limit: 200, cursor: " + cursor + "");
                error = true;
            }));
            if (response && response.status == 200 && ((_a = response.data) === null || _a === void 0 ? void 0 : _a.assets) && response.data.assets.length > 0) {
                assets.push(...response.data.assets);
                cursor = response.data.next;
                error = false;
            }
            else {
                console.log("Erreur lors de la requete de récupération des assets, owner: " + address + ", limit: 200, cursor: " + cursor + "");
                error = true;
            }
            yield new Promise(r => setTimeout(r, 4000));
        } while (cursor || error);
        return assets;
    });
}
//recuperation des assets pour chaque adresse
function getWalletsAssets(walletList) {
    return __awaiter(this, void 0, void 0, function* () {
        let adressAssets = {};
        let i = 0;
        for (const address of walletList) {
            i++;
            const AddAsset = yield getAdresseAsset(address);
            //console.log('Adresse: ' + i + '/' + walletList.length + ' - Nombre d\'asset pour ' + address + ': ' + AddAsset.length)
            adressAssets[address] = AddAsset;
        }
        return adressAssets;
    });
}
exports.getWalletsAssets = getWalletsAssets;
function getAssetEvent(asset) {
    return __awaiter(this, void 0, void 0, function* () {
        const openseaUrl = 'https://api.opensea.io/api/v1/events';
        let error = false;
        let cursor = '';
        //on boucle jusqu'a ce qu'il n'y ait plus d'erreur
        do {
            yield new Promise(resolve => setTimeout(resolve, 4000));
            const response = yield axios_1.default.get(openseaUrl, {
                headers: {
                    'X-API-KEY': process.env.OPENSEA_API_KEY
                },
                params: {
                    asset_contract_address: asset.asset_contract.address,
                    token_id: asset.token_id,
                    cursor: cursor,
                },
            })
                .catch((error) => __awaiter(this, void 0, void 0, function* () {
                console.log("Erreur lors de la requete de récupération des events");
                error = true;
            }));
            if (response && response.status == 200) {
                const data = response === null || response === void 0 ? void 0 : response.data;
                let i = 0;
                cursor = data === null || data === void 0 ? void 0 : data.next;
                error = false;
                while (i < (data === null || data === void 0 ? void 0 : data.asset_events.length)) {
                    const event = data === null || data === void 0 ? void 0 : data.asset_events[i];
                    if (event.event_type == 'successful') {
                        return 'successful';
                    }
                    else if (event.event_type == 'transfer' && event.from_account.address == '0x0000000000000000000000000000000000000000') {
                        return 'mint';
                    }
                    else if (event.event_type == 'transfer') {
                        if (i < (data === null || data === void 0 ? void 0 : data.asset_events.length) - 1 && (data === null || data === void 0 ? void 0 : data.asset_events[i + 1].event_type) == 'successful') {
                            return 'successful';
                        }
                        return 'transfer';
                    }
                    i++;
                }
            }
            else {
                console.log("Erreur lors de la requete de récupération des events");
                error = true;
            }
        } while (cursor || error);
        return 'no event';
    });
}
function trackWalletsAssets() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return __awaiter(this, void 0, void 0, function* () {
        while (true) {
            let walletList = yield (0, _2.getWalletList)();
            let walletListNew = walletList;
            console.log('Tracking lancé le ' + new Date().toLocaleString());
            let oldWalletAsset = yield getWalletsAssets(walletList);
            do {
                console.log('Checking...');
                const walletAsset = yield getWalletsAssets(walletList);
                for (const address of walletList) {
                    //console.log('Nombre d\'asset pour ' + address + ': ' + walletAsset[address].length)
                    //nand pour voir les asset different entre l'ancienne liste et la nouvelle
                    let nandList = oldWalletAsset[address]
                        .filter((item) => !walletAsset[address].some((z) => z.id === item.id))
                        .concat(walletAsset[address].filter((item) => !oldWalletAsset[address].some((z) => z.id === item.id)));
                    if (walletAsset[address].length != oldWalletAsset[address].length && nandList.length === 0) {
                        //console.log('erreur de filtre pour ' + address + ' - nombre d\'aaset avant: ' + oldWalletAsset[address].length + ' - nombre d\'asset apres: ' + walletAsset[address].length + ' - nombre d\'asset different: ' + nandList.length)
                    }
                    //si il y a des assets qui ont changé mais pas plus de 100 (pour eviter les erreurs)
                    if (nandList.length > 0 && nandList.length < 100) {
                        for (const asset of nandList) {
                            let action = '';
                            const event = yield getAssetEvent(asset);
                            //si c'est un achat ou une vente
                            if (event == 'successful') {
                                //si l'asset est dans l'ancienne liste c'est une vente
                                if (oldWalletAsset[address].find((x) => x.id == asset.id)) {
                                    action = 'sell';
                                }
                                //si l'asset est dans la nouvelle liste c'est un achat
                                else {
                                    action = 'buy';
                                }
                                //si c'est un transfert
                            }
                            else if (event == 'mint') {
                                action = 'mint';
                            }
                            else if (event == 'transfer') {
                                //si l'asset est dans l'ancienne liste c'est un envoi
                                if (oldWalletAsset[address].find((x) => x.id == asset.id)) {
                                    action = 'send';
                                    //si l'asset est dans la nouvelle liste c'est un asset reçu
                                }
                                else {
                                    action = 'airdrop';
                                }
                            }
                            else {
                                console.log('Erreur lors de la récupération de l\'event pour l\'asset ' + asset.name + ' sur l\'adresse ' + address);
                            }
                            if (action == 'sell') {
                                console.log(`Vente de ${asset.name} sur l'adresse ${address} le ${new Date().toLocaleString()}
                            \tPrix: ${asset.last_sale.total_price} ${asset.last_sale.payment_token.symbol}
                            \tPrix en ETH: ${(_b = (_a = asset === null || asset === void 0 ? void 0 : asset.last_sale) === null || _a === void 0 ? void 0 : _a.payment_token) === null || _b === void 0 ? void 0 : _b.eth_price} ETH
                            \tPrix en USD: ${(_d = (_c = asset === null || asset === void 0 ? void 0 : asset.last_sale) === null || _c === void 0 ? void 0 : _c.payment_token) === null || _d === void 0 ? void 0 : _d.usd_price} USD
                            \tContract: ${asset.asset_contract.address}
                            \tToken ID: ${asset.token_id}
                            \tOpenSea: ${asset.permalink}
                            `);
                                (0, _1.sell)(asset, address);
                            }
                            else if (action == 'buy') {
                                console.log(`Achat de ${asset.name} sur l'adresse ${address} le ${new Date().toLocaleString()}
                            \tPrix: ${asset.last_sale.total_price} ${asset.last_sale.payment_token.symbol}
                            \tPrix en ETH: ${(_f = (_e = asset === null || asset === void 0 ? void 0 : asset.last_sale) === null || _e === void 0 ? void 0 : _e.payment_token) === null || _f === void 0 ? void 0 : _f.eth_price} ETH
                            \tPrix en USD: ${(_h = (_g = asset === null || asset === void 0 ? void 0 : asset.last_sale) === null || _g === void 0 ? void 0 : _g.payment_token) === null || _h === void 0 ? void 0 : _h.usd_price} USD
                            \tContract: ${asset.asset_contract.address}
                            \tToken ID: ${asset.token_id}
                            \tOpenSea: ${asset.permalink}
                            `);
                                (0, _1.buy)(asset, address);
                            }
                            else if (action == 'mint') {
                                console.log(`Mint de ${asset.name} sur l'adresse ${address} le ${new Date().toLocaleString()}
                            \tContract: ${asset.asset_contract.address}
                            \tToken ID: ${asset.token_id}
                            \tOpenSea: ${asset.permalink}
                            `);
                                (0, _1.mint)(asset, address);
                            }
                            else if (action == 'airdrop') {
                                console.log(`Airdrop de ${asset.name} sur l'adresse ${address} le ${new Date().toLocaleString()}
                            \tContract: ${asset.asset_contract.address}
                            \tToken ID: ${asset.token_id}
                            \tOpenSea: ${asset.permalink}
                            `);
                            }
                            else if (action == 'send') {
                                console.log(`Envoi de ${asset.name} sur l'adresse ${address} le ${new Date().toLocaleString()}
                            \tContract: ${asset.asset_contract.address}
                            \tToken ID: ${asset.token_id}
                            \tOpenSea: ${asset.permalink}
                            `);
                            }
                            else {
                                console.log(`Evenement inconnu pour l'asset ${asset.name} sur l'adresse ${address} le ${new Date().toLocaleString()}
                            \tContract: ${asset.asset_contract.address}
                            \tToken ID: ${asset.token_id}
                            \tOpenSea: ${asset.permalink}
                            `);
                            }
                        }
                    }
                    if (nandList.length > 100) {
                        console.log('Resultat erroné trop d\'asset ont changé');
                    }
                    //fs.writeFileSync('./oldWallet.json', JSON.stringify(oldWalletAsset));
                }
                oldWalletAsset = walletAsset;
                //console.log('Analyse terminée on recommence')
                //await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 60));
                walletListNew = yield (0, _2.getWalletList)();
            } while (walletListNew.length == walletList.length);
        }
    });
}
exports.trackWalletsAssets = trackWalletsAssets;
function getContract(collection) {
    return __awaiter(this, void 0, void 0, function* () {
        const openseaUrl = 'https://api.opensea.io/api/v1/asset_contract/' + collection;
        axios_1.default.get(openseaUrl, {
            headers: {
                'X-API-KEY': process.env.OPENSEA_API_KEY
            },
        }).then((response) => __awaiter(this, void 0, void 0, function* () {
            const data = yield response.data;
            return data;
        }));
    });
}
exports.getContract = getContract;
(0, dotenv_1.config)();
