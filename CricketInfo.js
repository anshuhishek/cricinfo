let minimist= require("minimist");
let fs= require("fs");
let axios= require("axios");
let jsdom= require("jsdom");
let pdf= require("pdf-lib");
let path= require("path");
let excel4node= require("excel4node");
//exe->node CricketInfo.js --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results --datafolder=data --excel=worldcup.csv

let args= minimist(process.argv);
// console.log(args.source);
// console.log(args.datafolder);
// console.log(args.excel);
let resposeKaPromise=axios.get(args.source);
resposeKaPromise.then(function(response){
    let html = response.data;
    //console.log(html);
    let dom =new jsdom.JSDOM(html);
    let document= dom.window.document;
    //console.log(document.tittle);
    let matchScoredivs= document.querySelectorAll("div.ds-px-4.ds-py-3");
    //console.log(matchScoredivs.length)
    let matches=[];
    for(let i=0;i<matchScoredivs.length;i++){
        let match={
            t1:" ",
            t2:" ",
            t1s:" ",
            t2s:" ",
            result:" "
        };
        let scorespan=matchScoredivs[i].querySelectorAll("div.ds-text-compact-s>strong");
        if(scorespan.length==2){
            match.t1s=scorespan[0].textContent;
            match.t2s=scorespan[1].textContent;
        }
        else if(scorespan.length==1){
            match.t1s=scorespan[0].textContent;
        }else{
            match.t1s="not played";
            match.t2s="not played";
        }



        let teamparas=matchScoredivs[i].querySelectorAll("div.ds-flex>p.ds-text-tight-m");
        match.t1=teamparas[0].textContent;
        match.t2=teamparas[1].textContent;


        let resultspan=matchScoredivs[i].querySelector("p.ds-text-tight-s>span");
        match.result=resultspan.textContent;
        matches.push(match);
    }
    // console.log(matches);
    // console.log(matches.length);//checking..done
    let matcheskaJason=JSON.stringify(matches);
    fs.writeFileSync("matches.json",matcheskaJason,"utf-8");

    //team jason 
    let teams=[];
    for(let i=0;i<matches.length;i++){
        pushTeamInTeamsIfNotAlreadyThere(teams,matches[i].t1);
        pushTeamInTeamsIfNotAlreadyThere(teams,matches[i].t1);
    }
    //push match at appropriate place
    for(let i=0;i<matches.length;i++){
        pushMatchInAppropriatePlace(teams,matches[i].t1,matches[i].t2,matches[i].t1s,matches[i].t2s,matches[i].result);
        pushMatchInAppropriatePlace(teams,matches[i].t2,matches[i].t1,matches[i].t2s,matches[i].t1s,matches[i].result);
    }

    let teamKajason=JSON.stringify(teams);
    fs.writeFileSync("teams.json",teamKajason,"utf-8");
    prepareExcel(teams,args.excel);
    prepareFolderpdf(teams,args.datafolder);

    

})
function pushTeamInTeamsIfNotAlreadyThere(teams,teamName){
    let tidx=-1;
    for(j=0;j<teams.length;j++){
        if(teams[j].name==teamName){
            tidx=j;
        }
    }
    if(tidx==-1){
        let team={
             name:teamName,
             matches:[]

        }
        teams.push(team);
    }
}

function pushMatchInAppropriatePlace(teams,hometeam,oppteam,homescore,oppscore,result){
    let tidx=-1;
    for(let j=0;j<teams.length;j++){
        if(teams[j].name==hometeam){
            tidx=j;
            break;
        }
    }
    let team=teams[tidx];
    team.matches.push({
        vs:oppteam,
        selfscore:homescore,
        oppscore:oppscore,
        result:result
    })
}

function prepareExcel(teams, excelFileName){
    let wb =new excel4node.Workbook();
    for(let i=0;i<teams.length;i++){
        let tsheet=wb.addWorksheet(teams[i].name);
        tsheet.cell(1,1).string("vs");
        tsheet.cell(1,2).string("selfScore");
        tsheet.cell(1,3).string("oppScore");
        tsheet.cell(1,4).string("Result");
        for(let j=0;j<teams[i].matches.length;j++){
            tsheet.cell(2+j,1).string(teams[i].matches[j].vs);
            tsheet.cell(2+j,2).string(teams[i].matches[j].selfscore);
            tsheet.cell(2+j,3).string(teams[i].matches[j].oppscore);
            tsheet.cell(2+j,4).string(teams[i].matches[j].result);
        }


    }
    wb.write(excelFileName);
}

function prepareFolderpdf(team, data){
    if(fs.existsSync(data)==false){
        fs.mkdirSync(data);
    }
    for(let i=0;i<team.length;i++){
        let teamfolderName=path.join(data,team[i].name);
        if(fs.existsSync(teamfolderName)==false){
            fs.mkdirSync(teamfolderName);
        }
        for(let j=0;j<team[i].matches.length;j++){
            let match=team[i].matches[j];
            //finction calling
            creatematchScoreCardPdf(teamfolderName,team[i].name,match);
        }
    }
}
function creatematchScoreCardPdf(teamfolderName,hometeam,match){
    let matchfileName=path.join(teamfolderName,match.vs+ ".pdf");
    let templatefileBytes=fs.readFileSync("template.pdf");
    let pdfkapromise=pdf.PDFDocument.load(templatefileBytes);
    pdfkapromise.then(function(pdfdoc){
        let page=pdfdoc.getPage(0);
        page.drawText(hometeam,{
            x:500,
            y:700,
            size:8
        });
        page.drawText(match.vs,{
            x:500,
            y:700,
            size:8
        });
        page.drawText(match.selfscore,{
            x:500,
            y:700,
            size:8
        });
        page.drawText(match.oppscore,{
            x:500,
            y:700,
            size:8
        });
        page.drawText(match.result,{
            x:500,
            y:700,
            size:8
        });
        let changedbytekapromise=pdfdoc.save();
        changedbytekapromise.then(function(changedBytes){
            fs.writeFileSync(matchfileName,hometeam,match);
        });
    });
}