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

	export let data: Array<{ label: string; value: number }>;
	export let label: string = 'Value';
	export let color: string = '#3b82f6';
	export let height: number = 300;

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	$: if (canvas && data) {
		updateChart();
	}

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
