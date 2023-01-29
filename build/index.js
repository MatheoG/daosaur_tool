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
exports.mint = exports.buy = exports.sell = void 0;
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
let AddressList = [];
let guild;
const sheetUrl = "https://docs.google.com/spreadsheets/d/1rgcsVSTellDkHmgE8rjtrrHFLpkGzsS2/gviz/tq?tqx=out:csv&sheet=Feuil1";
axios_1.default.get(sheetUrl).then((response) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield response.data;
    let i = 0;
    for (const line of data.split('\n')) {
        i++;
        const address = line.split('"')[1].replace(" ", "").replace('\t', '');
        AddressList.push(address);
    }
    //AddressList = ['0xAF0bF449840aE803cB1F9ECdb8e14E57086269D6', '0x4e21da6a36213b6d1a5330efad5223a88f00aa2c']
    (0, opensea_1.trackWalletsAssets)(AddressList);
}));
let collectionBuyHistory = [];
let collectionSellHistory = [];
let collectionMintHistory = [];
const heure = 48;
function sell(asset) {
    return __awaiter(this, void 0, void 0, function* () {
        // let i = collectionSellHistory.length - 1
        // let nb = 1
        // while (i >= 0 && collectionSellHistory[i].timestamp > Date.now() - heure * 3600000) {
        //     if (collectionSellHistory[i].asset_contract == asset.asset_contract.address) {
        //         nb++
        //     }
        //     i--
        // }
        // if(nb >= 2){
        const channel = guild === null || guild === void 0 ? void 0 : guild.channels.cache.get(process.env.DISCORD_SELL_CHANNEL ? process.env.DISCORD_SELL_CHANNEL : "");
        if (channel && 'send' in channel) {
            channel.send(`New sell in last 48 hours of ${asset.asset_contract.name} (https://opensea.io/collection/${asset.collection.slug})`);
        }
        // }
        // collectionSellHistory.push({
        //     asset_contract: asset.asset_contract.address,
        //     timestamp: Date.now(),
        // })
    });
}
exports.sell = sell;
function buy(asset) {
    return __awaiter(this, void 0, void 0, function* () {
        // let i = collectionBuyHistory.length - 1
        // let nb = 1
        // while (i >= 0 && collectionBuyHistory[i].timestamp > Date.now() - heure * 3600000) {
        //     if (collectionBuyHistory[i].asset_contract == asset.asset_contract.address) {
        //         nb++
        //     }
        //     i--
        // }
        // if (nb >= 2) {
        const channel = guild === null || guild === void 0 ? void 0 : guild.channels.cache.get(process.env.DISCORD_BUY_CHANNEL ? process.env.DISCORD_BUY_CHANNEL : "");
        if (channel && 'send' in channel) {
            channel.send(`New buy in last 48 hours of ${asset.asset_contract.name} (https://opensea.io/collection/${asset.collection.slug})`);
        }
        // }
        // collectionBuyHistory.push({
        //     asset_contract: asset.asset_contract.address,
        //     timestamp: Date.now(),
        // })
    });
}
exports.buy = buy;
function mint(asset) {
    return __awaiter(this, void 0, void 0, function* () {
        // let i = collectionMintHistory.length - 1
        // let nb = 1
        // while (i >= 0 && collectionMintHistory[i].timestamp > Date.now() - heure * 3600000) {
        //     if (collectionMintHistory[i].asset_contract == asset.asset_contract.address) {
        //         nb++
        //     }
        //     i--
        // }
        // if(nb >= 2){
        const channel = guild === null || guild === void 0 ? void 0 : guild.channels.cache.get(process.env.DISCORD_MINT_CHANNEL ? process.env.DISCORD_MINT_CHANNEL : "");
        if (channel && 'send' in channel) {
            channel.send(`New mints in last 48 hours of ${asset.asset_contract.name} (https://opensea.io/collection/${asset.collection.slug})`);
        }
        // }
        // collectionMintHistory.push({
        //     asset_contract: asset.asset_contract.address,
        //     timestamp: Date.now(),
        // })
    });
}
exports.mint = mint;
client.on('ready', () => {
    guild = client.guilds.cache.get('971028591359967232');
});
;
(0, dotenv_1.config)();
client.login(process.env.TOKEN);
