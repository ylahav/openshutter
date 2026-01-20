<script lang="ts">
	const year = new Date().getFullYear();
</script>

<footer class="bg-black/95 backdrop-blur-md border-t border-purple-500/30 text-white mt-16 relative overflow-hidden">
	<!-- Animated background gradient -->
	<div class="absolute inset-0 opacity-20">
		<div class="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse"></div>
		<div class="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
	</div>
	
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
		<div class="text-center space-y-4">
			<div class="inline-flex items-center justify-center mb-4">
				<svg class="w-6 h-6 text-purple-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
				</svg>
			</div>
			<p class="text-purple-200 font-light" style="font-family: 'Playfair Display', serif;">
				© {year} OpenShutter. All rights reserved.
			</p>
		</div>
	</div>
</footer>
