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
exports.mint = exports.buy = exports.sell = exports.getWalletNb = exports.getHours = exports.getWalletList = void 0;
const axios_1 = __importDefault(require("axios"));
const opensea_1 = require("./opensea");
const discord_js_1 = require("discord.js");
const dotenv_1 = require("dotenv");
const intents = [
    discord_js_1.GatewayIntentBits.Guilds,
    discord_js_1.GatewayIntentBits.GuildMessages,
    discord_js_1.GatewayIntentBits.MessageContent,
    discord_js_1.GatewayIntentBits.GuildMembers,
    discord_js_1.GatewayIntentBits.GuildMessageReactions,
    discord_js_1.GatewayIntentBits.GuildMessageTyping,
    discord_js_1.GatewayIntentBits.GuildPresences,
    discord_js_1.GatewayIntentBits.GuildBans,
    discord_js_1.GatewayIntentBits.GuildInvites
];
const client = new discord_js_1.Client({ intents: intents, partials: [discord_js_1.Partials.Message, discord_js_1.Partials.Channel, discord_js_1.Partials.Reaction] });
//get Address list
let guild;
function getWalletList() {
    return __awaiter(this, void 0, void 0, function* () {
        let AddressList = [];
        const sheetUrl = "https://docs.google.com/spreadsheets/d/1rgcsVSTellDkHmgE8rjtrrHFLpkGzsS2/gviz/tq?tqx=out:csv&sheet=Feuil1";
        const response = yield axios_1.default.get(sheetUrl);
        const data = response.data;
        let i = 0;
        for (const line of data.split('\n')) {
            i++;
            const address = line.split('"')[1].replace(" ", "").replace('\t', '');
            AddressList.push(address);
        }
        return AddressList;
    });
}
exports.getWalletList = getWalletList;
function getHours() {
    return __awaiter(this, void 0, void 0, function* () {
        const sheetUrl = "https://docs.google.com/spreadsheets/d/1rgcsVSTellDkHmgE8rjtrrHFLpkGzsS2/gviz/tq?tqx=out:csv&sheet=Config&range=B1:B1";
        const response = yield axios_1.default.get(sheetUrl);
        const data = response.data;
        const hour = data.replace('"', '');
        return parseInt(hour);
    });
}
exports.getHours = getHours;
function getWalletNb() {
    return __awaiter(this, void 0, void 0, function* () {
        const sheetUrl = "https://docs.google.com/spreadsheets/d/1rgcsVSTellDkHmgE8rjtrrHFLpkGzsS2/gviz/tq?tqx=out:csv&sheet=Config&range=B2:B2";
        const response = yield axios_1.default.get(sheetUrl);
        const data = response.data;
        const walletNb = data.replace('"', '');
        return parseInt(walletNb);
    });
}
exports.getWalletNb = getWalletNb;
let sellHistory = [];
let buyHistory = [];
let mintHistory = [];
let MessageHistory = [];
function sell(asset, address) {
    return __awaiter(this, void 0, void 0, function* () {
        if (sellHistory.find((e) => e.adresse == address && e.asset_contract == asset.asset_contract.address)) {
            //update timestamp
            sellHistory.find((e) => e.adresse == address && e.asset_contract == asset.asset_contract.address).timestamp = Date.now();
        }
        else {
            sellHistory.push({
                adresse: address,
                asset_contract: asset.asset_contract.address,
                timestamp: Date.now(),
            });
        }
        const heure = yield getHours();
        const AddressList = yield getWalletList();
        const message = `Collection https://opensea.io/collection/${asset.collection.slug} was sell by ${sellHistory.length} wallets on ${AddressList.length} identified wallets!`;
        //verifier si le message n'a pas deja ete envoye dans les 60 dernières minutes et si le nombre de wallet est superieur à 2
        const sellHistoryLast = sellHistory.filter((e) => e.timestamp > Date.now() - heure * 3600000 && e.asset_contract == asset.asset_contract.address);
        if (sellHistoryLast.length >= (yield getWalletNb()) && !MessageHistory.find((e) => e.message == message && e.timestamp > Date.now() - 3600000)) {
            const channel = guild === null || guild === void 0 ? void 0 : guild.channels.cache.get(process.env.DISCORD_SELL_CHANNEL ? process.env.DISCORD_SELL_CHANNEL : "");
            if (channel && 'send' in channel) {
                channel.send(message);
            }
            MessageHistory.push({
                message: message,
                timestamp: Date.now()
            });
        }
    });
}
exports.sell = sell;
function buy(asset, address) {
    return __awaiter(this, void 0, void 0, function* () {
        if (buyHistory.find((e) => e.adresse == address && e.asset_contract == asset.asset_contract.address)) {
            //update timestamp
            buyHistory.find((e) => e.adresse == address && e.asset_contract == asset.asset_contract.address).timestamp = Date.now();
        }
        else {
            buyHistory.push({
                adresse: address,
                asset_contract: asset.asset_contract.address,
                timestamp: Date.now(),
            });
        }
        const heure = yield getHours();
        const buyHistoryLast = buyHistory.filter((e) => e.timestamp > Date.now() - heure * 3600000 && e.asset_contract == asset.asset_contract.address);
        const AddressList = yield getWalletList();
        const message = `Collection https://opensea.io/collection/${asset.collection.slug} was buy by ${buyHistoryLast.length} wallets on ${AddressList.length} identified wallets!`;
        //verifier si le message n'a pas deja ete envoye dans les 60 dernières minutes et si le nombre de wallet est superieur à 2*
        if (buyHistoryLast.length >= (yield getWalletNb()) && !MessageHistory.find((e) => e.message == message && e.timestamp > Date.now() - 3600000)) {
            const channel = guild === null || guild === void 0 ? void 0 : guild.channels.cache.get(process.env.DISCORD_BUY_CHANNEL ? process.env.DISCORD_BUY_CHANNEL : "");
            if (channel && 'send' in channel) {
                channel.send(message);
            }
            MessageHistory.push({
                message: message,
                timestamp: Date.now()
            });
        }
    });
}
exports.buy = buy;
function mint(asset, address) {
    return __awaiter(this, void 0, void 0, function* () {
        if (mintHistory.find((e) => e.adresse == address && e.asset_contract == asset.asset_contract.address)) {
            //update timestamp
            mintHistory.find((e) => e.adresse == address && e.asset_contract == asset.asset_contract.address).timestamp = Date.now();
        }
        else {
            //ajout dans l'historique
            mintHistory.push({
                adresse: address,
                asset_contract: asset.asset_contract.address,
                timestamp: Date.now(),
            });
        }
        const heure = yield getHours();
        const mintHistoryLast = mintHistory.filter((e) => e.timestamp > Date.now() - heure * 3600000 && e.asset_contract == asset.asset_contract.address);
        const AddressList = yield getWalletList();
        const message = `Collection https://opensea.io/collection/${asset.collection.slug} was minted by ${mintHistoryLast.length} wallets on ${AddressList.length} identified wallets!`;
        //verifier si le message n'a pas deja ete envoye dans les 60 dernières minutes et si le nombre de wallet est superieur ou egal a 2
        if (mintHistoryLast.length >= (yield getWalletNb()) && !MessageHistory.find((e) => e.message == message && e.timestamp > Date.now() - 3600000)) {
            const channel = guild === null || guild === void 0 ? void 0 : guild.channels.cache.get(process.env.DISCORD_MINT_CHANNEL ? process.env.DISCORD_MINT_CHANNEL : "");
            if (channel && 'send' in channel) {
                channel.send(`Collection https://opensea.io/collection/${asset.collection.slug} was minted by ${mintHistoryLast.length} wallets on ${AddressList.length} identified wallets!`);
            }
            MessageHistory.push({
                message: message,
                timestamp: Date.now()
            });
        }
    });
}
exports.mint = mint;
(0, opensea_1.trackWalletsAssets)();
client.on('ready', () => {
    guild = client.guilds.cache.get('971028591359967232');
});
;
(0, dotenv_1.config)();
client.login(process.env.TOKEN);
