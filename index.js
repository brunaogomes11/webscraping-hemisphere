const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scraping() {
    const browser = await puppeteer.launch({
        executablePath: process.env.NODE_ENV === 'production' ? process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath(),
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-gpu',
        ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    await page.goto("http://127.0.0.1:8080");
    await page.type('#j_username', 'kurt.olearys');
    await page.type('#j_password', 'XaKa2ipA');
    await page.click('.btn.btn-primary.btn-block');
    await page.waitForNavigation();
    await get_data_periodo_criticos(page);
    await browser.close();
}

async function get_data_periodo_criticos(page) {
    await page.goto('http://127.0.0.1:8080/periodo-critico/126', {timeout: 120000});
    await page.waitForSelector('a.list-group-item');
    const lista_doencas = await page.$$eval("a.list-group-item", elements => elements.map(el => el.href.trim()));
    for (let i = 0; i < lista_doencas.length; i++) {
        await page.goto(lista_doencas[i], {timeout: 6000});
        const tabelas_doenca = await page.$$eval("ul.nav-tabs li a", links => 
            links.map(link => link.href)
        );
        for (let k = 0; k < tabelas_doenca.length; k++) {
            await page.goto(tabelas_doenca[k], {timeout: 120000});
            await page.waitForSelector('li.bg-danger');
            const nome_tabela = await page.$eval("li.bg-danger > a", el => el.innerText.replace('/', "-"));
            let cabecalho = await page.$eval("#content > section > section > section > aside:nth-child(2) > div:nth-child(2) > div > section > section > table > thead", el => el.innerText.replace('\n', '').split('\t'));
            let linhas = await page.$eval("#content > section > section > section > aside:nth-child(2) > div:nth-child(2) > div > section > section > table > tbody", el => el.innerText.split('\n'));
            for (let k = 0; k < linhas.length; k++) {
                linhas[k] = linhas[k].split('\t');
            }
            saveToCSV(linhas, cabecalho, nome_tabela);
        }
    }
}

function saveToCSV(dados, cabecalho, nome_arquivo) {
    // Criar o cabeçalho com base no jogo com mais estatísticas
    const header = cabecalho.join(',') + '\n';
    // Criar as linhas, adicionando 'N/A' para estatísticas ausentes
    const rows = dados.map(match => {
        return Object.keys(cabecalho).map(key => {
            return match[key] || '-';
        }).join(',');
    }).join('\n');

    const csvContent = header + rows;
    const filename = `${nome_arquivo}.csv`;
    fs.writeFileSync(`datasets/${filename}`, csvContent, 'utf8');
}

scraping()