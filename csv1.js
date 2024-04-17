let fa = [
    // replace the path value with your csv files path
    { path: "data1.csv", head: "Day 1 energy datasheet" },
    { path: "data2.csv", head: "Day 2 energy datasheet" },
    { path: "data3.csv", head: "Day 3 energy datasheet" },
    { path: "data4.csv", head: "Day 4 energy datasheet" },
    { path: "data5.csv", head: "Day 5 energy datasheet" },
    { path: "data6.csv", head: "Day 6 energy datasheet" },
    { path: "data7.csv", head: "Day 7 energy datasheet" },
]
for (let i = 0; i < fa.length; i++) {
    document.querySelector("#nav").innerHTML+= `<a href="#table${i}">${fa[i].head}</a>
    
    `;
    
    document.querySelector("body").innerHTML += `
    <table id="table${i}">
    <thead>
    <tr>
    <th colspan="11">${fa[i].head}</th>
    </tr>
    </thead>
    <tbody id="tbody${i}"></tbody>
    </table>
     `;
     fetch(fa[i].path)
        .then(res => res.text())
        .then(data => {
            let result = data.split(/\r?\n|\r/)
            .map(e => {
                return e.split(",")
                .map(td => td !== "" ? `<td>${td}</td>` : "")
                .join("")
                .split("\n")
                .map(tr => tr !== "" ? `<tr>${tr}</tr>` : "")
                .join("");


            })
            document.querySelector(`#tbody${i}`).innerHTML = result.join("");
            //console.log(result);
        })
     
}