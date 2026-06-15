<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Chart,
		LineController,
		CategoryScale,
		LinearScale,
		PointElement,
		LineElement,
		Title,
		Tooltip,
		Legend,
		Filler,
		type ChartConfiguration,
		type ChartData
	} from 'chart.js';

	Chart.register(LineController, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

	let {
		data,
		label = 'Value',
		color = '#3b82f6',
		height = 300
	}: {
		data: Array<{ date: string; value: number }>;
		label?: string;
		color?: string;
		height?: number;
	} = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

$effect(() => { if (canvas && data) {
		updateChart();
	} });

	function updateChart() {
		if (!canvas) return;

		if (chart) {
			chart.destroy();
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		chart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: data.map((d) => d.date),
				datasets: [
					{
						label,
						data: data.map((d) => d.value),
						borderColor: color,
						backgroundColor: color + '20',
						tension: 0.4,
						fill: true,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: true,
						position: 'top',
					},
				},
				scales: {
					y: {
						beginAtZero: true,
					},
				},
			},
		});
	}

	onMount(() => {
		if (canvas && data) {
			updateChart();
		}
	});

	onDestroy(() => {
		if (chart) {
			chart.destroy();
		}
	});
</script>

<div style="height: {height}px; position: relative;">
	<canvas bind:this={canvas}></canvas>
</div>
