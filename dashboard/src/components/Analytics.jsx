import { useState } from "react";

function Analytics({ events }) {
  const filteredEvents = events.filter(e => e.acao !== "saindo_manual" && e.acao !== "entrando_manual");
  const [timeRange, setTimeRange] = useState("semana"); // "semana" ou "mes"
  const [offset, setOffset] = useState(0); // 0 = atual, 1 = anterior, 2 = 2 antes, etc.
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Formata data como "DD/MM"
  const formatDate = (timestamp) => {
    const d = new Date(timestamp);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Pega o nome do dia (ex: "Seg", "Ter")
  const getDayName = (timestamp) => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return days[new Date(timestamp).getDay()];
  };

  const handleRangeChange = (range) => {
    setTimeRange(range);
    setOffset(0); // Reseta o offset ao mudar a visualização
  };

  // Agrupa saídas e entradas por dia na semana (Domingo a Sábado) ou no Mês civil
  const getChartData = () => {
    const data = [];
    const now = new Date();
    
    if (timeRange === "semana") {
      // Encontra o Domingo da semana atual
      const currentDayOfWeek = now.getDay();
      const sundayOfCurrentWeek = new Date(now);
      sundayOfCurrentWeek.setDate(now.getDate() - currentDayOfWeek);
      
      // Desloca semanas de acordo com o offset (cada offset = 7 dias para trás)
      const targetSunday = new Date(sundayOfCurrentWeek);
      targetSunday.setDate(sundayOfCurrentWeek.getDate() - (offset * 7));
      
      // Gera de Domingo a Sábado (7 dias)
      for (let i = 0; i < 7; i++) {
        const d = new Date(targetSunday);
        d.setDate(targetSunday.getDate() + i);
        const dateStr = d.toLocaleDateString("pt-BR");
        data.push({
          dateStr,
          timestamp: d.getTime(),
          label: `${getDayName(d.getTime())} (${formatDate(d.getTime())})`,
          exits: 0,
          entries: 0
        });
      }
    } else {
      // Mês Civil:
      // offset = 0 representa o mês atual (ex: 1º de Junho a 30 de Junho)
      // offset = 1 representa 1 mês atrás
      const targetMonthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const year = targetMonthDate.getFullYear();
      const month = targetMonthDate.getMonth();
      
      // Quantidade de dias no mês alvo
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        const dateStr = d.toLocaleDateString("pt-BR");
        data.push({
          dateStr,
          timestamp: d.getTime(),
          label: `${getDayName(d.getTime())} (${formatDate(d.getTime())})`,
          exits: 0,
          entries: 0
        });
      }
    }

    // Conta os eventos associando-os aos dias correspondentes
    filteredEvents.forEach(event => {
      if (event.actualTimestamp) {
        const dateStr = new Date(event.actualTimestamp).toLocaleDateString("pt-BR");
        const dayObj = data.find(d => d.dateStr === dateStr);
        if (dayObj) {
          if (event.acao === "saindo") dayObj.exits++;
          else if (event.acao === "entrando") dayObj.entries++;
        }
      }
    });

    return data;
  };

  const chartData = getChartData();

  // Calcula as estatísticas baseando-se apenas nos dias atualmente visíveis no gráfico
  const getGeneralStats = (visibleData) => {
    let totalExits = 0;
    let totalEntries = 0;
    let periodCounts = { morning: 0, afternoon: 0, night: 0, midnight: 0 };
    
    const visibleDates = visibleData.map(d => d.dateStr);

    // Inverte a ordem do histórico para calcular cronologicamente (do mais antigo ao mais recente)
    const chronologicalEvents = [...filteredEvents]
      .reverse()
      .filter(event => {
        if (!event.actualTimestamp) return false;
        const dateStr = new Date(event.actualTimestamp).toLocaleDateString("pt-BR");
        return visibleDates.includes(dateStr);
      });

    let exitTime = null;
    let durations = [];

    chronologicalEvents.forEach(event => {
      const hour = new Date(event.actualTimestamp).getHours();
      
      // Contagem de períodos
      if (hour >= 6 && hour < 12) periodCounts.morning++;
      else if (hour >= 12 && hour < 18) periodCounts.afternoon++;
      else if (hour >= 18 && hour < 22) periodCounts.night++;
      else periodCounts.midnight++;

      if (event.acao === "saindo") {
        totalExits++;
        exitTime = event.actualTimestamp;
      } else if (event.acao === "entrando") {
        totalEntries++;
        if (exitTime) {
          // Calcula tempo na rua em minutos
          const diffMin = Math.round((event.actualTimestamp - exitTime) / 60000);
          // Ignora anomalias se o sensor ficou offline por dias
          if (diffMin > 0 && diffMin < 1440) {
            durations.push(diffMin);
          }
          exitTime = null;
        }
      }
    });

    const avgTime = durations.length > 0 
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    // Encontra o período mais ativo
    let peakPeriod = "Sem dados";
    let maxCount = -1;
    const periods = [
      { name: "Manhã (06h-12h)", val: periodCounts.morning },
      { name: "Tarde (12h-18h)", val: periodCounts.afternoon },
      { name: "Noite (18h-22h)", val: periodCounts.night },
      { name: "Madrugada (22h-06h)", val: periodCounts.midnight }
    ];
    
    periods.forEach(p => {
      if (p.val > maxCount && p.val > 0) {
        maxCount = p.val;
        peakPeriod = p.name;
      }
    });

    return { totalExits, totalEntries, avgTime, peakPeriod };
  };

  const { totalExits, totalEntries, avgTime, peakPeriod } = getGeneralStats(chartData);

  // Dimensões do Gráfico SVG
  const svgWidth = 600;
  const svgHeight = 240;
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  // Encontra o valor máximo para escalonamento do gráfico
  const maxOutings = Math.max(...chartData.map(d => Math.max(d.exits, d.entries)), 1);
  const scaleY = chartHeight / (maxOutings * 1.25); // 25% de margem no topo

  const stepX = chartWidth / chartData.length;

  return (
    <div className="analytics-view">
      
      {/* Cards de Estatísticas */}
      <div className="stats-row">
        <div className="card stat-box">
          <span className="stat-icon">📈</span>
          <div className="stat-data">
            <div className="stat-num">{totalExits}</div>
            <div className="stat-title">Total de Saídas</div>
          </div>
        </div>

        <div className="card stat-box">
          <span className="stat-icon">🕒</span>
          <div className="stat-data">
            <div className="stat-num">{avgTime ? `${avgTime} min` : "N/D"}</div>
            <div className="stat-title">Tempo Médio na Rua</div>
          </div>
        </div>

        <div className="card stat-box">
          <span className="stat-icon">🌅</span>
          <div className="stat-data">
            <div className="stat-num" style={{ fontSize: "1.1rem", fontWeight: "700" }}>{peakPeriod}</div>
            <div className="stat-title">Horário Mais Ativo</div>
          </div>
        </div>
      </div>

      {/* Layout com Setas Laterais margeando o Gráfico */}
      <div className="chart-navigation-layout">
        
        <button 
          className="chart-nav-btn"
          onClick={() => setOffset(prev => prev + 1)}
          title={timeRange === "semana" ? "Semana Anterior" : "Mês Anterior"}
        >
          ‹
        </button>

        <div className="card chart-card flex-grow" style={{ width: "100%" }}>
          <div className="card-header-actions">
            <div>
              <div className="chart-title-group" style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
                <h2>Gráfico de Frequência</h2>
                <span className="current-range-label" style={{ fontSize: "0.95rem", color: "var(--accent-blue)", fontWeight: "700" }}>
                  {timeRange === "semana" 
                    ? `(${chartData[0]?.dateStr} a ${chartData[chartData.length - 1]?.dateStr})`
                    : (() => {
                        if (chartData.length === 0) return "";
                        const firstDate = new Date(chartData[0]?.timestamp);
                        const monthNames = [
                          "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                          "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
                        ];
                        return `(${monthNames[firstDate.getMonth()]} / ${firstDate.getFullYear()})`;
                      })()
                  }
                </span>
              </div>
              <p className="description" style={{ marginTop: "4px", marginBottom: 0 }}>
                Quantidade de saídas e entradas por dia. Passe o mouse sobre as barras para ver detalhes.
              </p>
            </div>
            <div className="filter-group">
              <button 
                className={`filter-btn ${timeRange === "semana" ? "active" : ""}`}
                onClick={() => handleRangeChange("semana")}
              >
                Semana
              </button>
              <button 
                className={`filter-btn ${timeRange === "mes" ? "active" : ""}`}
                onClick={() => handleRangeChange("mes")}
              >
                Mês
              </button>
            </div>
          </div>

          <div className="svg-wrapper" style={{ position: "relative", marginTop: "20px" }}>
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="auto">
              {/* Linhas de Grade de Fundo */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const yVal = paddingY + chartHeight * (1 - ratio);
                const labelVal = Math.round(maxOutings * 1.25 * ratio);
                return (
                  <g key={index}>
                    <line 
                      x1={paddingX} 
                      y1={yVal} 
                      x2={svgWidth - paddingX} 
                      y2={yVal} 
                      stroke="rgba(255, 255, 255, 0.05)" 
                      strokeWidth="1"
                    />
                    <text 
                      x={paddingX - 10} 
                      y={yVal + 4} 
                      fill="var(--text-muted)" 
                      fontSize="10" 
                      textAnchor="end"
                    >
                      {labelVal}
                    </text>
                  </g>
                );
              })}

              {/* Renderização das Barras */}
              {chartData.map((d, i) => {
                const startX = paddingX + i * stepX;
                const barWidth = stepX * 0.35;
                const spaceBetween = stepX * 0.05;

                const hOut = d.exits * scaleY;
                const hIn = d.entries * scaleY;

                const yOut = paddingY + chartHeight - hOut;
                const yIn = paddingY + chartHeight - hIn;

                const labelX = startX + stepX / 2;
                const labelY = svgHeight - paddingY + 18;

                // Mostra todos os labels se for semanal, ou a cada 5 dias se for mensal para evitar sobreposição
                const shouldShowLabel = timeRange === "semana" || (i % 5 === 0) || (i === chartData.length - 1);

                return (
                  <g key={i}>
                    {/* Barra de Saídas (Laranja/Amarelo) */}
                    <rect
                      x={startX + stepX * 0.12}
                      y={yOut}
                      width={barWidth}
                      height={hOut}
                      fill="url(#exitGradient)"
                      rx={timeRange === "semana" ? "4" : "1"}
                      className="chart-bar"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />

                    {/* Barra de Entradas (Verde/Teal) */}
                    <rect
                      x={startX + stepX * 0.12 + barWidth + spaceBetween}
                      y={yIn}
                      width={barWidth}
                      height={hIn}
                      fill="url(#entryGradient)"
                      rx={timeRange === "semana" ? "4" : "1"}
                      className="chart-bar"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />

                    {/* Nome do Dia / Data */}
                    {shouldShowLabel && (
                      <text
                        x={labelX}
                        y={labelY}
                        fill="var(--text-muted)"
                        fontSize="9"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {timeRange === "semana" ? d.label.split(" ")[0] : formatDate(new Date(d.timestamp))}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Definições de Gradientes */}
              <defs>
                <linearGradient id="exitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
                <linearGradient id="entryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>

            {/* Tooltip Dinâmico ao Passar o Mouse */}
            {hoveredIndex !== null && (
              <div 
                className="chart-tooltip"
                style={{
                  position: "absolute",
                  bottom: `${(Math.max(chartData[hoveredIndex].exits, chartData[hoveredIndex].entries) * scaleY) + 30}px`,
                  left: `${paddingX + hoveredIndex * stepX + stepX / 2}px`,
                  transform: "translateX(-50%)",
                  pointerEvents: "none"
                }}
              >
                <div className="tooltip-title">{chartData[hoveredIndex].dateStr}</div>
                <div className="tooltip-row">
                  <span className="dot orange"></span> Saídas: <strong>{chartData[hoveredIndex].exits}</strong>
                </div>
                <div className="tooltip-row">
                  <span className="dot green"></span> Entradas: <strong>{chartData[hoveredIndex].entries}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Legenda do Gráfico */}
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-dot exit-dot"></span>
              <span>Saídas (Laranja)</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot entry-dot"></span>
              <span>Entradas (Verde)</span>
            </div>
          </div>

        </div>

        <button 
          className="chart-nav-btn"
          disabled={offset === 0}
          onClick={() => setOffset(prev => Math.max(0, prev - 1))}
          title={timeRange === "semana" ? "Próxima Semana" : "Próximo Mês"}
        >
          ›
        </button>

      </div>

    </div>
  );
}

export default Analytics;
