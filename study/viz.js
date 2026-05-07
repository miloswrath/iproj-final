// viz.js — D3 playtest data dashboard (self-contained, no build step)
(function () {
  'use strict';

  // ── Dimensions ──────────────────────────────────────────────────────────
  const M  = { top: 38, right: 24, bottom: 56, left: 60 };
  const W  = 460, H = 315;
  const iW = W - M.left - M.right;
  const iH = H - M.top  - M.bottom;

  // ── Tooltip ──────────────────────────────────────────────────────────────
  const tip = d3.select('body').append('div').attr('class', 'tooltip').style('opacity', 0);

  function showTip(html, event) {
    tip.html(html)
      .style('opacity', 1)
      .style('left', (event.pageX + 14) + 'px')
      .style('top',  (event.pageY - 36) + 'px');
  }
  function hideTip() { tip.style('opacity', 0); }

  // ── Color scales ─────────────────────────────────────────────────────────
  const enjoyColor = d3.scaleOrdinal()
    .domain([3, 4, 5])
    .range(['#f87171', '#fbbf24', '#34d399']);   // red / amber / emerald

  const questColor = d3.scaleOrdinal()
    .domain([1, 2, 3])
    .range(['#94a3b8', '#818cf8', '#a78bfa']);   // slate / indigo / violet

  // ── Data ─────────────────────────────────────────────────────────────────
  d3.csv('data.csv', row => ({
    id:        row.participant_id,
    time:      +row.completion_time_minutes,
    quests:    +row.quests_completed,
    enjoyment: +row.enjoyment_rating_1_5,
    dialogues: +row.npc_dialogues_completed,
    combat:    +row.combat_encounters_won_perc,
    replay:    +row.would_play_again_1_5,
  })).then(data => {
    renderStats(data);
    renderTimeChart(data);
    renderCombatScatter(data);
    renderNPCScatter(data);
    renderCorrelation(data);
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function makeSVG(id, title) {
    const wrap = d3.select(`#${id}`);
    wrap.append('p').attr('class', 'chart-title').text(title);
    return wrap.append('svg')
      .attr('width', W).attr('height', H)
      .append('g')
      .attr('transform', `translate(${M.left},${M.top})`);
  }

  function gridH(svg, scale, ticks) {
    svg.append('g').attr('class', 'grid')
      .selectAll('line').data(scale.ticks(ticks ?? 5)).join('line')
      .attr('x1', 0).attr('x2', iW)
      .attr('y1', d => scale(d)).attr('y2', d => scale(d));
  }

  function gridV(svg, scale, ticks) {
    svg.append('g').attr('class', 'grid')
      .selectAll('line').data(scale.ticks(ticks ?? 6)).join('line')
      .attr('x1', d => scale(d)).attr('x2', d => scale(d))
      .attr('y1', 0).attr('y2', iH);
  }

  function xLabel(svg, text) {
    svg.append('text').attr('class', 'axis-label')
      .attr('x', iW / 2).attr('y', iH + 44)
      .attr('text-anchor', 'middle').text(text);
  }

  function yLabel(svg, text) {
    svg.append('text').attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -iH / 2).attr('y', -50)
      .attr('text-anchor', 'middle').text(text);
  }

  // Deterministic jitter — stable across renders
  function jit(i, axis) {
    return ((i * (axis ? 17 : 13) + (axis ? 31 : 7)) % 19 - 9) * 0.65;
  }

  function linReg(xs, ys) {
    const mx = d3.mean(xs), my = d3.mean(ys);
    const slope = d3.sum(xs.map((x, i) => (x - mx) * (ys[i] - my))) /
                  d3.sum(xs.map(x => (x - mx) ** 2));
    return [slope, my - slope * mx];
  }

  function pearson(xs, ys) {
    const mx = d3.mean(xs), my = d3.mean(ys);
    const num = d3.sum(xs.map((x, i) => (x - mx) * (ys[i] - my)));
    const den = Math.sqrt(
      d3.sum(xs.map(x => (x - mx) ** 2)) *
      d3.sum(ys.map(y => (y - my) ** 2))
    );
    return den === 0 ? 0 : num / den;
  }

  // ── 1. Stats strip ────────────────────────────────────────────────────────
  function renderStats(data) {
    const items = [
      { val: `${d3.mean(data, d => d.time).toFixed(1)} min`,          label: 'Avg Completion Time' },
      { val: `${d3.mean(data, d => d.enjoyment).toFixed(1)} / 5`,     label: 'Avg Enjoyment' },
      { val: `${d3.mean(data, d => d.replay).toFixed(1)} / 5`,        label: 'Avg Replay Intent' },
      { val: `${(d3.mean(data, d => d.combat) * 100).toFixed(0)}%`,   label: 'Avg Combat Win Rate' },
      { val: `${d3.mean(data, d => d.dialogues).toFixed(1)}`,         label: 'Avg NPC Dialogues' },
    ];
    const row = d3.select('#stats');
    items.forEach(({ val, label }) => {
      const card = row.append('div').attr('class', 'stat-card');
      card.append('div').attr('class', 'stat-value').text(val);
      card.append('div').attr('class', 'stat-label').text(label);
    });
  }

  // ── 2. Completion time (horizontal bars, sorted, colored by enjoyment) ───
  function renderTimeChart(data) {
    const sorted = [...data].sort((a, b) => a.time - b.time);
    const svg = makeSVG('chart-time', 'Completion Time by Participant');

    const x = d3.scaleLinear().domain([0, d3.max(data, d => d.time) + 2]).range([0, iW]);
    const y = d3.scaleBand().domain(sorted.map(d => d.id)).range([0, iH]).padding(0.28);

    gridV(svg, x, 6);

    svg.append('g').attr('class', 'axis')
      .call(d3.axisLeft(y).tickSize(0))
      .select('.domain').remove();

    svg.append('g').attr('class', 'axis')
      .attr('transform', `translate(0,${iH})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d => `${d}m`));

    xLabel(svg, 'Minutes to Complete');

    svg.selectAll('rect').data(sorted).join('rect')
      .attr('y', d => y(d.id))
      .attr('height', y.bandwidth())
      .attr('x', 0).attr('width', 0)
      .attr('rx', 4)
      .attr('fill', d => enjoyColor(d.enjoyment))
      .attr('fill-opacity', 0.88)
      .on('mouseover', (event, d) => showTip(
        `<b>${d.id}</b><br>` +
        `Time: ${d.time} min<br>` +
        `Quests: ${d.quests} &nbsp;·&nbsp; Enjoyment: ${d.enjoyment}/5<br>` +
        `Combat Win: ${(d.combat * 100).toFixed(0)}%`, event))
      .on('mouseout', hideTip)
      .transition().duration(700).delay((_, i) => i * 55)
      .attr('width', d => x(d.time));

    svg.selectAll('.bar-val').data(sorted).join('text')
      .attr('class', 'bar-val')
      .attr('y', d => y(d.id) + y.bandwidth() / 2)
      .attr('x', d => x(d.time) + 5)
      .style('opacity', 0)
      .text(d => d.time)
      .transition().delay((_, i) => i * 55 + 680).duration(150)
      .style('opacity', 1);

    // Enjoyment legend
    const leg = svg.append('g').attr('transform', `translate(${iW - 116}, -30)`);
    leg.append('text').attr('class', 'legend-title').attr('y', 0).text('Enjoyment:');
    [3, 4, 5].forEach((v, i) => {
      leg.append('rect')
        .attr('x', i * 37).attr('y', 6).attr('width', 13).attr('height', 13)
        .attr('rx', 3).attr('fill', enjoyColor(v));
      leg.append('text').attr('class', 'legend-text')
        .attr('x', i * 37 + 17).attr('y', 13).text(v);
    });
  }

  // ── 3. Combat win % vs Enjoyment (scatter + regression) ──────────────────
  function renderCombatScatter(data) {
    const svg = makeSVG('chart-combat', 'Combat Win Rate vs Enjoyment');

    const x = d3.scaleLinear().domain([0, 1.05]).range([0, iW]);
    const y = d3.scaleLinear().domain([2.5, 5.5]).range([iH, 0]);

    gridH(svg, y, 3);

    svg.append('g').attr('class', 'axis')
      .attr('transform', `translate(0,${iH})`)
      .call(d3.axisBottom(x).tickFormat(d3.format('.0%')).ticks(6));

    svg.append('g').attr('class', 'axis')
      .call(d3.axisLeft(y).tickValues([3, 4, 5]));

    xLabel(svg, 'Combat Encounters Won (%)');
    yLabel(svg, 'Enjoyment Rating (1–5)');

    // Linear regression line
    const [slope, intercept] = linReg(data.map(d => d.combat), data.map(d => d.enjoyment));
    svg.append('line').attr('class', 'regression')
      .attr('x1', x(0)).attr('x2', x(1))
      .attr('y1', y(intercept)).attr('y2', y(slope + intercept));

    svg.selectAll('circle').data(data).join('circle')
      .attr('cx', (d, i) => x(d.combat) + jit(i, 0))
      .attr('cy', (d, i) => y(d.enjoyment) + jit(i, 1))
      .attr('r', 0)
      .attr('fill', d => questColor(d.quests))
      .attr('stroke', '#fff').attr('stroke-width', 1.5)
      .on('mouseover', (event, d) => showTip(
        `<b>${d.id}</b><br>` +
        `Combat Win: ${(d.combat * 100).toFixed(0)}%<br>` +
        `Enjoyment: ${d.enjoyment}/5 &nbsp;·&nbsp; Quests: ${d.quests}`, event))
      .on('mouseout', hideTip)
      .transition().duration(500).delay((_, i) => i * 45)
      .attr('r', 9);

    // Regression label
    const r = pearson(data.map(d => d.combat), data.map(d => d.enjoyment));
    svg.append('text').attr('class', 'legend-title')
      .attr('x', iW - 2).attr('y', -24)
      .attr('text-anchor', 'end')
      .text(`r = ${r.toFixed(2)}`);

    // Quest legend
    const leg = svg.append('g').attr('transform', `translate(4, -30)`);
    leg.append('text').attr('class', 'legend-title').attr('y', 0).text('Quests completed:');
    [1, 2, 3].forEach((v, i) => {
      leg.append('circle')
        .attr('cx', i * 44 + 8).attr('cy', 12).attr('r', 7)
        .attr('fill', questColor(v));
      leg.append('text').attr('class', 'legend-text')
        .attr('x', i * 44 + 19).attr('y', 13).text(v);
    });
  }

  // ── 4. NPC Dialogues vs Enjoyment (bubble = replay intent) ───────────────
  function renderNPCScatter(data) {
    const svg = makeSVG('chart-npc', 'NPC Engagement vs Enjoyment');

    const x = d3.scaleLinear().domain([1, d3.max(data, d => d.dialogues) + 1]).range([0, iW]);
    const y = d3.scaleLinear().domain([2.5, 5.5]).range([iH, 0]);
    const r = d3.scaleSqrt().domain([1, 5]).range([5, 14]);

    gridH(svg, y, 3);

    svg.append('g').attr('class', 'axis')
      .attr('transform', `translate(0,${iH})`)
      .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d')));

    svg.append('g').attr('class', 'axis')
      .call(d3.axisLeft(y).tickValues([3, 4, 5]));

    xLabel(svg, 'NPC Dialogues Completed');
    yLabel(svg, 'Enjoyment Rating (1–5)');

    svg.selectAll('circle').data(data).join('circle')
      .attr('cx', (d, i) => x(d.dialogues) + jit(i, 0))
      .attr('cy', (d, i) => y(d.enjoyment) + jit(i, 1))
      .attr('r', 0)
      .attr('fill', d => enjoyColor(d.enjoyment))
      .attr('fill-opacity', 0.83)
      .attr('stroke', '#fff').attr('stroke-width', 1.5)
      .on('mouseover', (event, d) => showTip(
        `<b>${d.id}</b><br>` +
        `NPC Dialogues: ${d.dialogues}<br>` +
        `Enjoyment: ${d.enjoyment}/5 &nbsp;·&nbsp; Replay: ${d.replay}/5`, event))
      .on('mouseout', hideTip)
      .transition().duration(500).delay((_, i) => i * 45)
      .attr('r', d => r(d.replay));

    const npcR = pearson(data.map(d => d.dialogues), data.map(d => d.enjoyment));
    svg.append('text').attr('class', 'legend-title')
      .attr('x', iW - 2).attr('y', -24)
      .attr('text-anchor', 'end')
      .text(`r = ${npcR.toFixed(2)}`);

    // Size legend
    const leg = svg.append('g').attr('transform', `translate(4, -30)`);
    leg.append('text').attr('class', 'legend-title').attr('y', 0).text('Size = Replay intent:');
    [3, 5].forEach((v, i) => {
      leg.append('circle')
        .attr('cx', i * 54 + r(v)).attr('cy', 12).attr('r', r(v))
        .attr('fill', '#94a3b8').attr('fill-opacity', 0.45)
        .attr('stroke', '#94a3b8').attr('stroke-width', 1);
      leg.append('text').attr('class', 'legend-text')
        .attr('x', i * 54 + r(v) * 2 + 5).attr('y', 13)
        .text(`${v}/5`);
    });
  }

  // ── 5. Pearson correlation heatmap ────────────────────────────────────────
  function renderCorrelation(data) {
    const fields = ['time', 'quests', 'enjoyment', 'dialogues', 'combat', 'replay'];
    const labels = ['Time', 'Quests', 'Enjoy', 'NPC', 'Combat', 'Replay'];
    const n = fields.length;

    const matrix = fields.map(f1 => fields.map(f2 =>
      pearson(data.map(d => d[f1]), data.map(d => d[f2]))
    ));

    // Slightly wider card to fit gradient bar
    const cW = 460, cH = 315;
    const cM = { top: 50, right: 42, bottom: 20, left: 62 };
    const ciW = cW - cM.left - cM.right;
    const ciH = cH - cM.top - cM.bottom;
    const cell = Math.min(ciW / n, ciH / n);

    const wrap = d3.select('#chart-corr');
    wrap.append('p').attr('class', 'chart-title').text('Metric Correlation Matrix');

    const svg = wrap.append('svg')
      .attr('width', cW).attr('height', cH)
      .append('g').attr('transform', `translate(${cM.left},${cM.top})`);

    const colorScale = d3.scaleSequential()
      .domain([-1, 1])
      .interpolator(d3.interpolateRdYlGn);

    const cellData = matrix.flatMap((row, i) => row.map((val, j) => ({ i, j, val })));

    const g = svg.selectAll('g.cell').data(cellData).join('g')
      .attr('class', 'cell')
      .attr('transform', d => `translate(${d.j * cell},${d.i * cell})`);

    g.append('rect')
      .attr('width', cell - 3).attr('height', cell - 3)
      .attr('rx', 4)
      .attr('fill', d => d.i === d.j ? '#f1f5f9' : colorScale(d.val))
      .on('mouseover', (event, d) => showTip(
        d.i === d.j
          ? `<b>${labels[d.i]}</b>`
          : `${labels[d.i]} × ${labels[d.j]}<br>r = ${d.val.toFixed(3)}`,
        event))
      .on('mouseout', hideTip);

    g.append('text')
      .attr('x', (cell - 3) / 2).attr('y', (cell - 3) / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('class', 'corr-val')
      .attr('fill', d => {
        if (d.i === d.j) return '#64748b';
        return Math.abs(d.val) > 0.52 ? '#ffffff' : '#1e293b';
      })
      .attr('font-weight', d => d.i === d.j ? 600 : 400)
      .style('font-size', d => d.i === d.j ? '10px' : '11px')
      .text(d => d.i === d.j ? labels[d.i] : d.val.toFixed(2));

    // Axis labels (only left + top to avoid redundancy)
    svg.selectAll('.row-label').data(labels).join('text')
      .attr('class', 'row-label')
      .attr('x', -8).attr('y', (_, i) => i * cell + (cell - 3) / 2 + 4)
      .attr('text-anchor', 'end')
      .text(d => d);

    svg.selectAll('.col-label').data(labels).join('text')
      .attr('class', 'col-label')
      .attr('x', (_, i) => i * cell + (cell - 3) / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .text(d => d);

    // Gradient legend bar (right side)
    const legX = n * cell + 10;
    const legH = n * cell;
    const legW = 10;

    const defs = svg.append('defs');
    const grad = defs.append('linearGradient')
      .attr('id', 'corr-grad').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
    // RdYlGn: top=+1=green, middle=0=yellow, bottom=-1=red
    [
      [0, '#1a9850'], [0.25, '#91cf60'], [0.5, '#ffffbf'],
      [0.75, '#fc8d59'], [1, '#d73027'],
    ].forEach(([offset, color]) =>
      grad.append('stop').attr('offset', offset).attr('stop-color', color));

    svg.append('rect')
      .attr('x', legX).attr('y', 0)
      .attr('width', legW).attr('height', legH)
      .attr('rx', 3).attr('fill', 'url(#corr-grad)');

    ['+1', '0', '-1'].forEach((label, i) => {
      svg.append('text')
        .style('font-size', '10px').style('fill', '#94a3b8')
        .attr('x', legX + legW + 4)
        .attr('y', (legH * i / 2) + 4)
        .text(label);
    });
  }
})();
