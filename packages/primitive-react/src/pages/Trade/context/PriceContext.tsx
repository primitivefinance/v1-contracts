import { createContext } from "react";

const ethPriceApi =
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true";

const getPrice = () => {
    let context = {
        ethereum: { usd: "", usd_24h_change: "" },
        isLoaded: false,
        error: null,
    };
    fetch(ethPriceApi)
        .then((res) => res.json())
        .then(
            (result) => {
                console.log(result);
                Object.assign(context, {
                    isLoaded: true,
                    ethereum: result.ethereum,
                });
            },
            // Note: it's important to handle errors here
            // instead of a catch() block so that we don't swallow
            // exceptions from actual bugs in components.
            (error) => {
                Object.assign(context, {
                    isLoaded: true,
                    error: error,
                });
                console.log(error);
            }
        );
    console.log(context);
    return context;
};

const context = getPrice();
const PriceContext = createContext(context);

export default PriceContext;
