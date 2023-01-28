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
const axios_1 = __importDefault(require("axios"));
const opensea_1 = require("./opensea");
//get Address list
let AddressList = [];
const sheetUrl = "https://docs.google.com/spreadsheets/d/1rgcsVSTellDkHmgE8rjtrrHFLpkGzsS2/gviz/tq?tqx=out:csv&sheet=Feuil1";
axios_1.default.get(sheetUrl).then((response) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield response.data;
    let i = 0;
    for (const line of data.split('\n')) {
        i++;
        if (i <= 10) {
            const address = line.split('"')[1].replace(" ", "").replace('\t', '');
            AddressList.push(address);
        }
    }
    //AddressList = ['0xAF0bF449840aE803cB1F9ECdb8e14E57086269D6']
    (0, opensea_1.trackWalletsAssets)(AddressList);
}));
