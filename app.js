import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader' 
import GUI from 'lil-gui'
import gsap from 'gsap'
import fragmentShader from './shaders/fragment.glsl'
import vertexShader from './shaders/vertex.glsl'
 
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass'
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass'
import {GlitchPass} from 'three/examples/jsm/postprocessing/GlitchPass'

import sphere360 from './test.png'
import earth from './earth.png'



function calcPosFromLatLonRad(lat, lon) {
	const phi = (lat) * (Math.PI / 180),
		thelta = (lon + 180) * (Math.PI / 180),
		thelta1 = (270 - lon) * (Math.PI / 180),
		x = - (Math.cos(phi) * Math.cos(thelta)),
		z = (Math.cos(phi) * Math.sin(thelta)),
		y = (Math.sin(phi))
		let vector = {x,y,z}
		let euler = new THREE.Euler(phi, thelta1, 0, 'XYZ')
		let quaternion = new THREE.Quaternion().setFromEuler(euler)

		return {vector, quaternion}

}

let points = [
	{
		title: 'kyiv',
		coords: {
			lat: 50.4501,
			lng: 30.5234
		},
		texture: sphere360
	},
	{
		title: 'Cancun',
		coords: {
			lat: 21.1619,
			lng: -86.8515
		},
		texture: sphere360

	},
	{
		title: 'Paris',
		coords: {
			lat: 48.8566,
			lng: 2.3522
		},
		texture: sphere360

	}
]



export default class Sketch {
	constructor(options) {
		
		this.scene360 = new THREE.Scene()
		this.scenePlanet = new THREE.Scene()
		this.sceneFinal = new THREE.Scene()


		
		this.container = options.dom
		
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		
		
		// // for renderer { antialias: true }
		this.renderer = new THREE.WebGLRenderer({ antialias: true })
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height)
		this.renderer.setSize(this.width ,this.height )
		this.renderer.setClearColor(0xeeeeee, 1)
		this.renderer.useLegacyLights = true
		// this.renderer.outputEncoding = THREE.sRGBEncoding
 

		 
		this.renderer.setSize( window.innerWidth, window.innerHeight )

		this.container.appendChild(this.renderer.domElement)
 


		this.camera = new THREE.PerspectiveCamera( 70,
			 this.width / this.height,
			 0.01,
			 100
		)


		

		this.camera1 = new THREE.PerspectiveCamera( 70,
			this.width / this.height,
			0.01,
			100
	  )

 
		this.camera.position.set(0, 0, 2) 
		this.camera1.position.set(0, 0, 2) 

		this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.controls1 = new OrbitControls(this.camera1, this.renderer.domElement)

		this.time = 0


		this.dracoLoader = new DRACOLoader()
		this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
		this.gltf = new GLTFLoader()
		this.gltf.setDRACOLoader(this.dracoLoader)

		this.isPlaying = true


		const frustumSize = 1,
			aspect = this.width / this.height
		
		this.cameraFinal = new THREE.OrthographicCamera(frustumSize / -2, frustumSize / 2, frustumSize / 2, frustumSize / -2, -1000, 1000)
		this.cameraFinal.position.set(0, 0, 2)
		


 
		this.create360()		 

		this.createPlanet()
		this.createFinalScene()
		this.resize()
		this.render()
		this.setupResize()
		this.settings()
 
	}

	createFinalScene() {
		this.material = new THREE.ShaderMaterial({
			extensions: {
				derivatives: '#extension GL_OES_standard_derivatives : enable'
			},
			side: THREE.DoubleSide,
			uniforms: {
				time: {value: 0},
				progress: {value: 0},
				scene360: {value: null},
				scenePlanet: {value: null}
			},
			vertexShader,
			fragmentShader
		})

		this.texture360 = new THREE.WebGLRenderTarget(this.width, this.height, {
			format: THREE.RGBAFormat,
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,

		})
		this.textureplanet = new THREE.WebGLRenderTarget(this.width, this.height, {
			format: THREE.RGBAFormat,
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,

		})


		let geo = new THREE.PlaneGeometry(1,1)

		let mesh = new THREE.Mesh(geo, this.material)

		this.sceneFinal.add(mesh)
	}

	settings() {
		let that = this
		this.settings = {
			progress: 0
		}
		this.gui = new GUI()
		this.gui.add(this.settings, 'progress', 0, 1, 0.01)
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this))
	}

	resize() {
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		this.renderer.setSize(this.width, this.height)
		this.camera.aspect = this.width / this.height


		// this.imageAspect = 853/1280
		// let a1, a2
		// if(this.height / this.width > this.imageAspect) {
		// 	a1 = (this.width / this.height) * this.imageAspect
		// 	a2 = 1
		// } else {
		// 	a1 = 1
		// 	a2 = (this.height / this.width) / this.imageAspect
		// } 


		// this.material.uniforms.resolution.value.x = this.width
		// this.material.uniforms.resolution.value.y = this.height
		// this.material.uniforms.resolution.value.z = a1
		// this.material.uniforms.resolution.value.w = a2

		this.camera.updateProjectionMatrix()



	}


	create360() {
	 
		this.geometry = new THREE.SphereGeometry(10,30, 30)
	
		let t = new THREE.TextureLoader().load(sphere360)
		t.wrapS = THREE.RepeatWrapping
		t.repeat.x = -1
	
		this.sphere = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({
			map: t,
			side: THREE.BackSide
		}))
 
		this.scene360.add(this.sphere)
 
	}

	createPlanet() {
		let that = this
		 

		this.group = new THREE.Group()


		this.earth = new THREE.Mesh(new THREE.SphereGeometry(1,30, 30), 
			new THREE.MeshBasicMaterial({
				map: new THREE.TextureLoader().load(earth),
			})
		)
		this.group.add(this.earth)
		this.scenePlanet.add(this.group)


		let list = document.getElementById('list')


		points.forEach(p => {
			let coords = calcPosFromLatLonRad(p.coords.lat, p.coords.lng)

			let el = document.createElement('div')
			el.innerText = p.title
			list.appendChild(el)

			let mesh = new THREE.Mesh(
				new THREE.SphereGeometry(0.02, 20, 20),
				new THREE.MeshBasicMaterial({color: 0xff00000})
			)
			this.group.add(mesh)
			mesh.position.copy(coords.vector)


			let animatedQuaternion = new THREE.Quaternion()
		 
		 
			let currentQuaternion = new THREE.Quaternion()




			el.addEventListener('click', () => {
				let o = {p: 0}
 

				currentQuaternion.copy(this.group.quaternion)
				gsap.to(o, {
					p: 1,
					duration: 1,
					onUpdate: () => {
						animatedQuaternion.slerpQuaternions(currentQuaternion, coords.quaternion, o.p)
						
						this.group.quaternion.copy(animatedQuaternion)
				
					}
				})

				gsap.to(this.settings, {
					duration: 1,
					delay: 0.5,
					progress: 1
				})


				//this.group.quaternion.copy(coords.quaternion)
			})

		})
		
	}



	addLights() {
		const light1 = new THREE.AmbientLight(0xeeeeee, 0.5)
		this.scene.add(light1)
	
	
		const light2 = new THREE.DirectionalLight(0xeeeeee, 0.5)
		light2.position.set(0.5,0,0.866)
		this.scene.add(light2)
	}

	stop() {
		this.isPlaying = false
	}

	play() {
		if(!this.isPlaying) {
			this.isPlaying = true
			this.render()
		}
	}

	render() {
		if(!this.isPlaying) return
		this.time += 0.05
		this.material.uniforms.time.value = this.time
		 
		//this.renderer.setRenderTarget(this.renderTarget)
		// this.renderer.render(this.scene360, this.camera)
		// this.renderer.render(this.scenePlanet, this.camera)

		this.renderer.setRenderTarget(this.texture360)
		this.renderer.render(this.scene360, this.camera)
		this.renderer.setRenderTarget(this.textureplanet)
		this.renderer.render(this.scenePlanet, this.camera)

		this.material.uniforms.scene360.value = this.texture360.texture
		this.material.uniforms.scenePlanet.value = this.textureplanet.texture		
		this.material.uniforms.progress.value = this.settings.progress

		this.renderer.setRenderTarget(null)



		this.renderer.render(this.sceneFinal, this.cameraFinal)


		//this.renderer.setRenderTarget(null)
 
		requestAnimationFrame(this.render.bind(this))
	}
 
}
new Sketch({
	dom: document.getElementById('container')
})
 