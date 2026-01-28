import "../styles/reportes.css";

export default function Reportes() {
  const BASE = "orgId=1&theme=dark&kiosk=1&from=now-30d&to=now&refresh=10s";

  // DASHBOARD 1 (ranking)
  const DASH_RANKING = "http://localhost:3000/d/admq8jd/new-dashboard";
  const PANEL_RANKING = "panel-1";

  // DASHBOARD 2 (setup vs tiempo)
  const DASH_SETUP = "http://localhost:3000/d/adb9czh/proyecto-2";
  const PANEL_SETUP = "panel-1";

  // DASHBOARD 3 (P/A/M)
  const DASH_PAM = "http://localhost:3000/d/adhvclz/proyecto-3";
  const PANEL_PAM = "panel-1";

  return (
    <div className="reportes-page">
      <h2>Reportes (Grafana)</h2>
      <p className="sub"></p>

      <div className="grid-reportes">
        <div className="card-reporte">
          <div className="card-header">
            <h3>Ranking por simulación y circuito</h3>
            <span className="hint">Panel 1</span>
          </div>

          <div className="iframe-wrap">
            <iframe
              src={`${DASH_RANKING}?${BASE}&viewPanel=${PANEL_RANKING}`}
              title="Ranking"
              frameBorder="0"
              allowFullScreen
            />
          </div>
        </div>

        <div className="card-reporte">
          <div className="card-header">
            <h3>Mismo carro: setups vs tiempo</h3>
            <span className="hint">Panel 2</span>
          </div>

          <div className="iframe-wrap">
            <iframe
              src={`${DASH_SETUP}?${BASE}&viewPanel=${PANEL_SETUP}`}
              title="Setup vs tiempo"
              frameBorder="0"
              allowFullScreen
            />
          </div>
        </div>

        <div className="card-reporte full">
          <div className="card-header">
            <h3>Tiempo y relación con P, A y M</h3>
            <span className="hint">Panel 3</span>
          </div>

          <div className="iframe-wrap tall">
            <iframe
              src={`${DASH_PAM}?${BASE}&viewPanel=${PANEL_PAM}`}
              title="Tiempo vs P A M"
              frameBorder="0"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </div>
  );
}