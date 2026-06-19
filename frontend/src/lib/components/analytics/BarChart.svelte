<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Chart,
		BarController,
		CategoryScale,
		LinearScale,
		BarElement,
		Title,
		Tooltip,
		Legend,
		type ChartConfiguration,
		type ChartData
	} from 'chart.js';

	Chart.register(BarController, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

	let {
		data,
		label = 'Value',
		color = '#3b82f6',
		height = 300
	}: {
		data: Array<{ label: string; value: number }>;
		label?: string;
		color?: string;
		height?: number;
	} = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = $state(null);

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
			type: 'bar',
			data: {
				labels: data.map((d) => d.label),
				datasets: [
					{
						label,
						data: data.map((d) => d.value),
						backgroundColor: color + '80',
						borderColor: color,
						borderWidth: 1,
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
