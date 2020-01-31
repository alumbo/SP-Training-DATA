import React from "react";
import "./App.css";
import { StyledDropZone } from "react-drop-zone";
import "react-drop-zone/dist/styles.css";
import JSZip from "jszip";

class App extends React.Component {
  state = {
    exercices: [],
    googleSheets: []
  };

  componentDidMount() {
    this.handleClientLoad();
  }

  uploaded(file) {
    JSZip.loadAsync(file).then(zip => {
      const exercices = [];
      let fileCount = 0;
      const filesLength = Object.keys(zip.files).length;
      console.log("filesLength " + filesLength);
      zip.forEach((relativePath, zipEntry) => {
        zipEntry.async("text").then(csv => {
          let exercice = zipEntry.name.split(".csv")[0].replace(/[0-9]/g, "");
          if (!exercices[exercice])
            exercices[exercice] = {
              name: exercice,
              columnsData: [],
              columnsLabels: csv.split("\n")[0].split(",")
            };
          exercices[exercice].columnsData = exercices[
            exercice
          ].columnsData.concat(this.getExerciceData(csv));
          fileCount++;
          this.setState({ count: fileCount + " / " + filesLength });
          if (filesLength === fileCount) {
            this.setState({ count: filesLength, exercices });
          }
        });
      });
    });
  }

  getExerciceData(csv) {
    const columnsData = [];
    const lines = csv.split("\n");
    lines.forEach((data, index) => {
      if (index > 0) {
        data = data.split(",");
        data[0] = this.formatDate(data[0]);
        columnsData.push(data);
      }
    });
    return columnsData;
  }

  handleClientLoad() {
    if (window.gapi) {
      this.gapi = window.gapi;
      this.gapi.load("client:auth2", this.initClient.bind(this));
    }
  }

  authorizeGoogleSheets() {
    this.gapi.auth2.getAuthInstance().signIn();
  }

  initClient() {
    this.gapi.client
      .init({
        apiKey: "AIzaSyBrR9qOdPIkzf7CBLrr3nJowVmW5RnMftg",
        clientId:
          "1073336890291-o769trl75e6mqc76l58pnejk8bnb9bhv.apps.googleusercontent.com",
        discoveryDocs: [
          "https://sheets.googleapis.com/$discovery/rest?version=v4"
        ],
        scope: "https://www.googleapis.com/auth/spreadsheets"
      })
      .then(() => {
        this.gapi.auth2
          .getAuthInstance()
          .isSignedIn.listen(this.updateSigninStatus.bind(this));
        this.updateSigninStatus(
          this.gapi.auth2.getAuthInstance().isSignedIn.get()
        );
      });
  }

  updateSigninStatus(isSignedIn) {
    this.spreadsheets = this.gapi.client.sheets.spreadsheets;
    this.setState({ isSignedIn });
  }
  getdateFr() {
    var jours = [
      "dimanche",
      "lundi",
      "mardi",
      "mercredi",
      "jeudi",
      "vendredi",
      "samedi"
    ];
    var mois = [
      "janvier",
      "fevrier",
      "mars",
      "avril",
      "mai",
      "juin",
      "juillet",
      "aout",
      "septembre",
      "octobre",
      "novembre",
      "decembre"
    ];
    var date = new Date();
    var message = jours[date.getDay()] + " ";
    message += date.getDate() + " ";
    message += mois[date.getMonth()] + " ";
    message += date.getFullYear();
    return message;
  }

  getHeure() {
    var date = new Date();
    var heure = date.getHours();
    var minutes = date.getMinutes();
    if (minutes < 10) minutes = "0" + minutes;
    return heure + "h" + minutes;
  }

  getSheet(exerciceName) {
    const exerciceData = this.state.exercices[exerciceName];
    const sheet = {
      properties: {
        title: exerciceName
      },
      data: this.getSheetData(exerciceData)
    };
    return sheet;
  }

  formatDate(date) {
    const MS_PER_70YEARS_2DAYS = 2209161599801;
    const MS_PER_DAY = 86400000;
    date = date.split("/");
    date = new Date(date[2] + "-" + date[1] + "-" + date[0]);
    const time = date.getTime() + MS_PER_70YEARS_2DAYS;
    const days = Math.ceil((time / MS_PER_DAY) * 100000) / 100000;
    return days;
  }

  getSheetData(exerciceData) {
    const data = [];

    exerciceData.columnsData.sort((a, b) => {
      const dateA = a[0];
      const dateB = b[0];
      if (dateA < dateB) {
        return -1;
      }
      if (dateA > dateB) {
        return 1;
      }
      return 0;
    });

    data.push({
      startRow: 0,
      startColumn: 0,
      rowData: {
        values: exerciceData.columnsLabels.map(value => {
          return { userEnteredValue: { stringValue: value } };
        })
      }
    });

    exerciceData.columnsData.forEach((row, index) => {
      let rowData = {
        values: row.map((value, rowIndex) => {
          if (rowIndex > 0) return { userEnteredValue: { numberValue: value } };
          return {
            userEnteredValue: { numberValue: value },
            userEnteredFormat: {
              numberFormat: { type: "DATE", pattern: "d mmm yyyy" }
            }
          };
        })
      };
      data.push({
        startRow: index + 1,
        startColumn: 0,
        rowData
      });
    });
    return data;
  }

  getSheets() {
    const sheets = [];
    Object.keys(this.state.exercices).forEach((exerciceName, index) => {
      sheets.push(this.getSheet(exerciceName));
    });
    return sheets;
  }

  export() {
    const title =
      "Sp Training DATA (" + this.getdateFr() + " à " + this.getHeure() + ")";
    this.setState({
      exportLoading: true
    });
    var spreadsheetBody = {
      properties: {
        title
      },
      sheets: this.getSheets()
    };

    var request = this.gapi.client.sheets.spreadsheets.create(
      {},
      spreadsheetBody
    );
    request.then(response => {
      console.log(response.result);
      const url =
        "https://docs.google.com/spreadsheets/d/" +
        response.result.spreadsheetId;
      window.open(url);
      const googleSheets = this.state.googleSheets;
      googleSheets.push({
        url,
        title
      });
      this.setState({
        googleSheets,
        exportLoading: false
      });
    });
  }

  render() {
    const charts = [];
    let totalSeries = 0;
    Object.keys(this.state.exercices).forEach((exerciceName, index) => {
      const exerciceData = this.state.exercices[exerciceName];
      const chartData = exerciceData.columnsData;
      totalSeries += chartData.length;
      charts.push(
        <div
          key={"chart" + index}
          className="exercice"
          style={{ fontSize: chartData.length / 4 + 8 }}
        >
          <span>{exerciceName}</span>
          <br />
          <span>{chartData.length} séries</span>
        </div>
      );
    });
    const googleSheets = [];
    this.state.googleSheets.forEach((sheet, index) => {
      googleSheets.push(
        <a
          href={sheet.url}
          target="_blank"
          rel="noopener noreferrer"
          title={sheet.title}
          className="sheet"
        >
          <img src="sheet.webp" alt={sheet.title} />
        </a>
      );
    });
    return (
      <div className="App">
        <h1>
          <img src="favicon.png" alt="SP Training Data" />
        </h1>
        {charts.length === 0 && !this.state.exportLoading ? (
          <StyledDropZone
            accept="application/zip"
            onDrop={this.uploaded.bind(this)}
            label={
              <span>
                Glissez le fichier <em>SP Training.zip</em> ici
              </span>
            }
          />
        ) : null}
        {this.state.count ? (
          <h1 className="count">{this.state.count} exercices</h1>
        ) : null}
        {totalSeries > 0 ? <h2>{totalSeries} séries au total</h2> : null}
        {charts.length > 0 && !this.state.isSignedIn ? (
          <button onClick={this.authorizeGoogleSheets.bind(this)}>
            Connexion à Google sheets
          </button>
        ) : null}
        {this.state.isSignedIn &&
        charts.length > 0 &&
        !this.state.exportLoading ? (
          <button onClick={this.export.bind(this)}>
            Créer une nouvelle feuille Google sheets
          </button>
        ) : (
          ""
        )}
        {this.state.exportLoading ? <p>Export en cours...</p> : null}
        <br />
        {googleSheets}
        <br />
        {charts}
      </div>
    );
  }
}

export default App;
