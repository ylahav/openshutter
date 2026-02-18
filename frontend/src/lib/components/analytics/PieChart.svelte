<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Chart,
		ArcElement,
		PieController,
		CategoryScale,
		LinearScale,
		Title,
		Tooltip,
		Legend,
		type ChartConfiguration,
		type ChartData
	} from 'chart.js';

	Chart.register(PieController, ArcElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

	export let data: Array<{ label: string; value: number }>;
	export let height: number = 300;
	export let colors: string[] = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
			type: 'pie',
			data: {
				labels: data.map((d) => d.label),
				datasets: [
					{
						data: data.map((d) => d.value),
						backgroundColor: colors.slice(0, data.length),
						borderColor: '#fff',
						borderWidth: 2,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: true,
						position: 'right',
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
