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
const fs_1 = __importDefault(require("fs"));
function getAdresseAsset(address) {
    return __awaiter(this, void 0, void 0, function* () {
        const openseaUrl = 'https://api.opensea.io/api/v1/assets';
        let assets = [];
        let cursor = '';
        let error = false;
        //on boucle jusqu'a ce qu'il n'y ait plus d'erreur
        do {
            yield axios_1.default.get(openseaUrl, {
                headers: {
                    'X-API-KEY': process.env.OPENSEA_API_KEY
                },
                params: {
                    owner: address,
                    limit: 200,
                    cursor: cursor,
                }
            })
                .then((response) => __awaiter(this, void 0, void 0, function* () {
                //console.log(response.data)
                if (response.status == 200) {
                    assets.push(...response.data.assets);
                    cursor = response.data.next;
                }
                else {
                    console.log("Erreur lors de la requete de récupération des assets");
                    error = true;
                }
            }))
                .catch((error) => __awaiter(this, void 0, void 0, function* () {
                console.log("Erreur lors de la requete de récupération des assets");
                error = true;
            }));
            yield new Promise(r => setTimeout(r, 4000));
        } while (cursor && !error);
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
            console.log('Adresse: ' + i + '/' + walletList.length + ' - Nombre d\'asset pour ' + address + ': ' + AddAsset.length);
            adressAssets[address] = AddAsset;
        }
        return adressAssets;
    });
}
exports.getWalletsAssets = getWalletsAssets;
function trackWalletsAssets(walletList) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Tracking lancé le ' + new Date().toLocaleString());
        const oldWalletFile = fs_1.default.readFileSync('./oldWallet.json', 'utf8');
        let oldWalletAsset = oldWalletFile.length > 0 ? JSON.parse(oldWalletFile) : yield getWalletsAssets(walletList);
        while (true) {
            console.log('Checking...');
            const walletAsset = yield getWalletsAssets(walletList);
            for (const address of walletList) {
                console.log('Nombre d\'asset pour ' + address + ': ' + walletAsset[address].length);
                //nand pour voir les asset different entre l'ancienne liste et la nouvelle
                let nandList = oldWalletAsset[address]
                    .filter((item) => !walletAsset[address].some((z) => z.id === item.id))
                    .concat(walletAsset[address].filter((item) => !oldWalletAsset[address].some((z) => z.id === item.id)));
                console.log(nandList.length + ' asset(s) ont changé');
                //si il y a des assets qui ont changé mais pas plus de 100 (pour eviter les erreurs)
                if (nandList.length > 0 && nandList.length < 100) {
                    for (const asset of nandList) {
                        //pour chaque asset qui a changé on recupere les evenements
                        const openseaUrl = 'https://api.opensea.io/api/v1/events';
                        let error = false;
                        let eventType = '';
                        let cursor = null;
                        //on boucle jusqu'a ce qu'il n'y ait plus d'erreur       
                        do {
                            yield new Promise(resolve => setTimeout(resolve, 4000));
                            yield axios_1.default.get(openseaUrl, {
                                headers: {
                                    'X-API-KEY': process.env.OPENSEA_API_KEY
                                },
                                params: {
                                    asset_contract_address: asset.asset_contract.address,
                                    token_id: asset.token_id,
                                    limit: 200,
                                    cursor: cursor,
                                },
                            })
                                .then((response) => __awaiter(this, void 0, void 0, function* () {
                                var _a;
                                if (response.status != 200) {
                                    const data = yield (response === null || response === void 0 ? void 0 : response.data);
                                    let event = '';
                                    let y = 0;
                                    cursor = (_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.next;
                                    //on recupere le dernier evenement
                                    while ((event === null || event === void 0 ? void 0 : event.event_type) != 'successful' && (event === null || event === void 0 ? void 0 : event.event_type) != 'transfer') {
                                        event = response === null || response === void 0 ? void 0 : response.data.asset_events[y];
                                        y++;
                                    }
                                    //si c'est un achat ou une vente
                                    if (event.event_type == 'successful') {
                                        //si l'asset est dans l'ancienne liste c'est une vente
                                        if (asset in oldWalletAsset[address]) {
                                            eventType = 'sell';
                                        }
                                        //si l'asset est dans la nouvelle liste c'est un achat
                                        else {
                                            eventType = 'buy';
                                        }
                                        //si c'est un transfert
                                    }
                                    else {
                                        //si l'asset est dans l'ancienne liste c'est un envoi
                                        if (asset in oldWalletAsset[address]) {
                                            eventType = 'send';
                                            //si l'asset est dans la nouvelle liste c'est un asset reçu
                                        }
                                        else {
                                            //si il provient d'une adresse vide c'est un mint
                                            if (event.from_account.address == '0x0000000000000000000000000000000000000000') {
                                                eventType = 'mint';
                                                //sinon c'est un airdrop
                                            }
                                            else {
                                                eventType = 'airdrop';
                                            }
                                        }
                                    }
                                    eventType = event === null || event === void 0 ? void 0 : event.event_type;
                                    error = false;
                                }
                                else {
                                    console.log("Erreur lors de la requete de récupération des events");
                                    error = true;
                                }
                            }))
                                .catch((error) => __awaiter(this, void 0, void 0, function* () {
                                console.log("Erreur lors de la requete de récupération des events");
                                error = true;
                            }));
                        } while (error || cursor);
                        if (eventType == 'sell') {
                            console.log('Vente de ' + asset.name + ' sur l\'adresse ' + address + ' le ' + new Date().toLocaleString());
                            (0, _1.sell)(asset);
                        }
                        else if (eventType == 'buy') {
                            console.log('Achat de ' + asset.name + ' sur l\'adresse ' + address + ' le ' + new Date().toLocaleString());
                            (0, _1.buy)(asset);
                        }
                        else if (eventType == 'mint') {
                            console.log('Mint de ' + asset.name + ' sur l\'adresse ' + address + ' le ' + new Date().toLocaleString());
                            (0, _1.mint)(asset);
                        }
                        else if (eventType == 'airdrop') {
                            console.log('Airdrop de ' + asset.name + ' sur l\'adresse ' + address + ' le ' + new Date().toLocaleString());
                        }
                        else if (eventType == 'send') {
                            console.log('Envoi de ' + asset.name + ' sur l\'adresse ' + address + ' le ' + new Date().toLocaleString());
                        }
                        else {
                            console.log('unknown event type');
                        }
                    }
                }
                if (nandList.length > 100) {
                    console.log('Resultat erroné trop d\'asset ont changé');
                }
                oldWalletAsset = walletAsset;
                fs_1.default.writeFileSync('./oldWallet.json', JSON.stringify(oldWalletAsset));
            }
            //console.log('Analyse terminée on recommence')
            //await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 60));
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
