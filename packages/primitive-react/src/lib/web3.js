export const connect = async (web3React, injected) => {
    try {
        await web3React.activate(injected);
    } catch (err) {
        console.log(err);
    }
};

export const disconnect = async (web3React) => {
    try {
        await web3React.deactivate();
    } catch (err) {
        console.log(err);
    }
};
