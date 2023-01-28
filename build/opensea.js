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
//recuperation des assets pour chaque adresse
function getWalletsAssets(walletList) {
    return __awaiter(this, void 0, void 0, function* () {
        let adressAssets = {};
        let i = 0;
        for (const address of walletList) {
            let assets = [];
            let cursor = '';
            i++;
            do {
                const openseaUrl = 'https://api.opensea.io/api/v1/assets';
                axios_1.default.get(openseaUrl, {
                    headers: {
                        'X-API-KEY': process.env.OPENSEA_API_KEY
                    },
                    params: {
                        owner: address,
                        limit: 50,
                        cursor: cursor,
                    }
                })
                    .catch((error) => __awaiter(this, void 0, void 0, function* () {
                    console.log("Erreur lors de la requete de récupération des assets");
                }))
                    .then((response) => __awaiter(this, void 0, void 0, function* () {
                    const data = yield (response === null || response === void 0 ? void 0 : response.data);
                    console.log('Nombre d\'asset pour ' + address + ': ' + data.assets.length);
                    assets.push(...data.assets);
                    cursor = data === null || data === void 0 ? void 0 : data.next;
                }));
                yield new Promise(resolve => setTimeout(resolve, 1000));
            } while (cursor);
            //  console.log('Adresse: ' + i)
            adressAssets[address] = assets;
        }
        return adressAssets;
    });
}
exports.getWalletsAssets = getWalletsAssets;
function trackWalletsAssets(walletList) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Tracking...');
        let oldWalletAsset = yield getWalletsAssets(walletList);
        while (true) {
            console.log('Checking...');
            const walletAsset = yield getWalletsAssets(walletList);
            for (const address of walletList) {
                console.log('Nombre d\'asset pour ' + address + ': ' + walletAsset[address].length);
                let nandList = oldWalletAsset[address]
                    .filter((item) => !walletAsset[address].some((z) => z.id === item.id))
                    .concat(walletAsset[address].filter((item) => !oldWalletAsset[address].some((z) => z.id === item.id)));
                //console.log(nandList);
                if (nandList.length > 0) {
                    for (const asset of nandList) {
                        //pour chaque asset qui a changé on recupere les evenements
                        const openseaUrl = 'https://api.opensea.io/api/v1/events';
                        axios_1.default.get(openseaUrl, {
                            headers: {
                                'X-API-KEY': process.env.OPENSEA_API_KEY
                            },
                            params: {
                                asset_contract_address: asset.asset_contract.address,
                                token_id: asset.token_id,
                                limit: 50,
                            },
                        })
                            .catch((error) => __awaiter(this, void 0, void 0, function* () {
                            console.log("Erreur lors de la requete de récupération des events");
                        }))
                            .then((response) => __awaiter(this, void 0, void 0, function* () {
                            const data = yield (response === null || response === void 0 ? void 0 : response.data);
                            let event = '';
                            let y = 0;
                            //on recupere le dernier evenement
                            while ((event === null || event === void 0 ? void 0 : event.event_type) != 'successful' && (event === null || event === void 0 ? void 0 : event.event_type) != 'transfer') {
                                event = response === null || response === void 0 ? void 0 : response.data.asset_events[y];
                                y++;
                            }
                            //si c'est un achat ou une vente
                            if (event.event_type == 'successful') {
                                //si l'asset est dans l'ancienne liste c'est une vente
                                if (asset in oldWalletAsset[address]) {
                                    console.log('vente on adresse: ' + address + " " + asset.name + " " + asset.token_id);
                                    (0, _1.sell)(asset);
                                }
                                //si l'asset est dans la nouvelle liste c'est un achat
                                else {
                                    console.log('achat on adresse: ' + address + " " + asset.name + " " + asset.token_id);
                                    (0, _1.buy)(asset);
                                }
                                //si c'est un transfert
                            }
                            else {
                                //si l'asset est dans l'ancienne liste c'est un envoi
                                if (asset in oldWalletAsset[address]) {
                                    console.log('envoi on adresse: ' + address + " " + asset.name + " " + asset.token_id);
                                    //si l'asset est dans la nouvelle liste c'est un asset reçu
                                }
                                else {
                                    //si il provient d'une adresse vide c'est un mint
                                    if (event.from_account.address == '0x0000000000000000000000000000000000000000') {
                                        console.log('mint on adresse: ' + address + " " + asset.name + " " + asset.token_id);
                                        (0, _1.mint)(asset);
                                        //sinon c'est un airdrop
                                    }
                                    else {
                                        console.log('airdrop on adresse: ' + address + " " + asset.name + " " + asset.token_id);
                                    }
                                }
                            }
                        }));
                        yield new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
            oldWalletAsset = walletAsset;
            //console.log('Analyse terminée on recommence')
            yield new Promise(resolve => setTimeout(resolve, 1000 * 60 * 60));
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
