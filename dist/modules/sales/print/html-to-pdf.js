import { chromium } from "playwright-core";
import { InternalServerError } from "../../../shared/errors/app-error.js";
const PDF_ENGINE_MESSAGE = "Nao foi possivel gerar o PDF da Ordem de Servico. Instale o Google Chrome ou o Microsoft Edge, ou defina CHROME_EXECUTABLE_PATH.";
const launchOptions = () => ({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
});
let browser = null;
let launching = null;
const tryLaunch = async (options) => {
    try {
        return await chromium.launch(options);
    }
    catch {
        return null;
    }
};
const launchBrowser = async () => {
    const executablePath = process.env.CHROME_EXECUTABLE_PATH?.trim();
    const base = launchOptions();
    if (executablePath) {
        const fromPath = await tryLaunch({ ...base, executablePath });
        if (fromPath)
            return fromPath;
    }
    for (const channel of ["chrome", "msedge"]) {
        const fromChannel = await tryLaunch({ ...base, channel });
        if (fromChannel)
            return fromChannel;
    }
    const bundled = await tryLaunch(base);
    if (bundled)
        return bundled;
    throw new InternalServerError(PDF_ENGINE_MESSAGE, "PDF_ENGINE_UNAVAILABLE");
};
const getBrowser = async () => {
    if (browser?.isConnected())
        return browser;
    if (!launching) {
        launching = launchBrowser()
            .then((instance) => {
            browser = instance;
            instance.on("disconnected", () => {
                if (browser === instance)
                    browser = null;
            });
            return instance;
        })
            .finally(() => {
            launching = null;
        });
    }
    return launching;
};
export const closePdfBrowser = async () => {
    const instance = browser;
    browser = null;
    launching = null;
    if (instance?.isConnected()) {
        await instance.close();
    }
};
export const htmlToPdf = async (html) => {
    const instance = await getBrowser();
    const page = await instance.newPage();
    try {
        await page.setContent(html, {
            waitUntil: "load",
            timeout: 15_000,
        });
        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
        });
        return Buffer.from(pdf);
    }
    finally {
        await page.close();
    }
};
