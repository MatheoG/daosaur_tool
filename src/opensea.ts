import axios from 'axios';
import { config } from 'dotenv';
import { asset } from './interface';
import { sell, buy, mint } from '.';
import fs from 'fs';
import { getWalletList } from '.';

async function getAdresseAsset(address: string) {
    const openseaUrl = 'https://api.opensea.io/api/v1/assets'
    let assets: asset[] = []
    let cursor = ''
    let error = false;
    //on boucle jusqu'a ce qu'il n'y ait plus d'erreur
    do {
        const response = await axios.get(openseaUrl, {
            headers: {
                'X-API-KEY': process.env.OPENSEA_API_KEY
            },
            params: {
                owner: address,
                limit: 200,
                cursor: cursor,
            }
        })
            .catch(async (error) => {
                console.log("Erreur lors de la requete de récupération des assets, owner: " + address + ", limit: 200, cursor: " + cursor + "")
                error = true
            });
        if (response && response.status == 200 && response.data?.assets && response.data.assets.length > 0) {
            assets.push(...response.data.assets)
            cursor = response.data.next
            error = false
        } else {
            console.log("Erreur lors de la requete de récupération des assets, owner: " + address + ", limit: 200, cursor: " + cursor + "")
            error = true
        }
        await new Promise(r => setTimeout(r, 4000));
    } while (cursor || error)
    return assets
}

//recuperation des assets pour chaque adresse
export async function getWalletsAssets(walletList: string[]) {
    let adressAssets: any = {}
    let i = 0
    for (const address of walletList) {
        i++
        const AddAsset = await getAdresseAsset(address)
        //console.log('Adresse: ' + i + '/' + walletList.length + ' - Nombre d\'asset pour ' + address + ': ' + AddAsset.length)
        adressAssets[address] = AddAsset
    }
    return adressAssets
}

async function getAssetEvent(asset: asset) {
    const openseaUrl = 'https://api.opensea.io/api/v1/events'
    let error = false
    let cursor: string = ''
    //on boucle jusqu'a ce qu'il n'y ait plus d'erreur
    do {
        await new Promise(resolve => setTimeout(resolve, 4000));
        const response = await axios.get(openseaUrl, {
            headers: {
                'X-API-KEY': process.env.OPENSEA_API_KEY
            },
            params: {
                asset_contract_address: asset.asset_contract.address,
                token_id: asset.token_id,
                cursor: cursor,
            },
        })
            .catch(async (error) => {
                console.log("Erreur lors de la requete de récupération des events")
                error = true
            });
        if (response && response.status == 200) {
            const data = response?.data
            let i = 0
            cursor = data?.next
            error = false
            while (i < data?.asset_events.length) {
                const event = data?.asset_events[i]
                if (event.event_type == 'successful') {
                    return 'successful'
                } else if (event.event_type == 'transfer' && event.from_account.address == '0x0000000000000000000000000000000000000000') {
                    return 'mint'
                } else if (event.event_type == 'transfer') {
                    if (i < data?.asset_events.length - 1 && data?.asset_events[i + 1].event_type == 'successful') {
                        return 'successful'
                    }
                    return 'transfer'
                }
                i++
            }
        } else {
            console.log("Erreur lors de la requete de récupération des events")
            error = true
        }
    } while (cursor || error)
    return 'no event'
}

export async function trackWalletsAssets() {
    while (true) {
        let walletList = await getWalletList()
        let walletListNew = walletList
        console.log('Tracking lancé le ' + new Date().toLocaleString());
        let oldWalletAsset = await getWalletsAssets(walletList)

        do {
            console.log('Checking...')
            const walletAsset = await getWalletsAssets(walletList)
            for (const address of walletList) {
                //console.log('Nombre d\'asset pour ' + address + ': ' + walletAsset[address].length)
                //nand pour voir les asset different entre l'ancienne liste et la nouvelle
                let nandList = oldWalletAsset[address]
                    .filter((item: asset) => !walletAsset[address].some((z: asset) => z.id === item.id))
                    .concat(walletAsset[address].filter((item: asset) => !oldWalletAsset[address].some((z: asset) => z.id === item.id)));
                if (walletAsset[address].length != oldWalletAsset[address].length && nandList.length === 0) {
                    //console.log('erreur de filtre pour ' + address + ' - nombre d\'aaset avant: ' + oldWalletAsset[address].length + ' - nombre d\'asset apres: ' + walletAsset[address].length + ' - nombre d\'asset different: ' + nandList.length)
                }
                //si il y a des assets qui ont changé mais pas plus de 100 (pour eviter les erreurs)
                if (nandList.length > 0 && nandList.length < 100) {
                    for (const asset of nandList) {
                        let action = ''
                        const event = await getAssetEvent(asset)
                        //si c'est un achat ou une vente
                        if (event == 'successful') {
                            //si l'asset est dans l'ancienne liste c'est une vente
                            if (oldWalletAsset[address].find((x: asset) => x.id == asset.id)) {
                                action = 'sell'
                            }
                            //si l'asset est dans la nouvelle liste c'est un achat
                            else {
                                action = 'buy'
                            }
                            //si c'est un transfert
                        }
                        else if (event == 'mint') {
                            action = 'mint'
                        }
                        else if (event == 'transfer') {
                            //si l'asset est dans l'ancienne liste c'est un envoi
                            if (oldWalletAsset[address].find((x: asset) => x.id == asset.id)) {
                                action = 'send'
                                //si l'asset est dans la nouvelle liste c'est un asset reçu
                            } else {
                                action = 'airdrop'
                            }
                        } else {
                            console.log('Erreur lors de la récupération de l\'event pour l\'asset ' + asset.name + ' sur l\'adresse ' + address)
                        }
                        if (action == 'sell') {
                            console.log(`Vente de ${asset.name} sur l'adresse ${address} le ${new Date().toLocaleString()}
                            \tPrix: ${asset.last_sale?.total_price} ${asset.last_sale?.payment_token.symbol}
                            \tPrix en ETH: ${asset?.last_sale?.payment_token?.eth_price} ETH
                            \tPrix en USD: ${asset?.last_sale?.payment_token?.usd_price} USD
                            \tContract: ${asset.asset_contract.address}
                            \tToken ID: ${asset.token_id}
                            \tOpenSea: ${asset.permalink}
                            `)
                            sell(asset, address)
                        } else if (action == 'buy') {
                            console.log(`Achat de ${asset.name} sur l'adresse ${address} le ${new Date().toLocaleString()}
                            \tPrix: ${asset.last_sale?.total_price} ${asset.last_sale?.payment_token.symbol}
                            \tPrix en ETH: ${asset?.last_sale?.payment_token?.eth_price} ETH
                            \tPrix en USD: ${asset?.last_sale?.payment_token?.usd_price} USD
                            \tContract: ${asset.asset_contract.address}
                            \tToken ID: ${asset.token_id}
                            \tOpenSea: ${asset.permalink}
                            `)
                            buy(asset, address)
                        } else if (action == 'mint') {
                            console.log(`Mint de ${asset.name} sur l'adresse ${address} le ${new Date().toLocaleString()}
                            \tContract: ${asset.asset_contract.address}
                            \tToken ID: ${asset.token_id}
                            \tOpenSea: ${asset.permalink}
                            `)
                            mint(asset, address)
                        } else if (action == 'airdrop') {
                            console.log(`Airdrop de ${asset.name} sur l'adresse ${address} le ${new Date().toLocaleString()}
                            \tContract: ${asset.asset_contract.address}
                            \tToken ID: ${asset.token_id}
                            \tOpenSea: ${asset.permalink}
                            `)
                        } else if (action == 'send') {
                            console.log(`Envoi de ${asset.name} sur l'adresse ${address} le ${new Date().toLocaleString()}
                            \tContract: ${asset.asset_contract.address}
                            \tToken ID: ${asset.token_id}
                            \tOpenSea: ${asset.permalink}
                            `)
                        } else {
                            console.log(`Evenement inconnu pour l'asset ${asset.name} sur l'adresse ${address} le ${new Date().toLocaleString()}
                            \tContract: ${asset.asset_contract.address}
                            \tToken ID: ${asset.token_id}
                            \tOpenSea: ${asset.permalink}
                            `)
                        }
                    }
                }
                if (nandList.length > 100) {
                    console.log('Resultat erroné trop d\'asset ont changé')
                }
                //fs.writeFileSync('./oldWallet.json', JSON.stringify(oldWalletAsset));
            }
            oldWalletAsset = walletAsset
            //console.log('Analyse terminée on recommence')
            //await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 60));
            walletListNew = await getWalletList()
        } while (walletListNew.length == walletList.length)
    }

}

export async function getContract(collection: string) {
    const openseaUrl = 'https://api.opensea.io/api/v1/asset_contract/' + collection
    axios.get(openseaUrl, {
        headers: {
            'X-API-KEY': process.env.OPENSEA_API_KEY
        },
    }).then(async (response) => {
        const data = await response.data
        return data
    });
}
config();