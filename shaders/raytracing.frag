#version 430

//util pour illustrer certain truc
#define NORMAL_OFFSET 0.0001 //set to 0 to observe shadow acnee, leave it to 0.01 otherwise.
#define LIGHT_WIDTH 0.5 //permet d'illustrer les softs shadows - TODO valeur approx ?
#define CHECKER_SIZE 3

#pragma optimize(off)

#define BGCOLOR vec3(0.5,0.7,0.5) //red BG to immediately see it in debug

uniform vec2 screen; // send SCREEN_X and SCREEN_Y

uniform vec3 cam_pos;
uniform vec3 cam_right;
uniform vec3 cam_up;
uniform vec3 cam_forward;
uniform float cam_distance;

//shader info
uniform int shadingMode;
uniform int shadowMode; 
uniform int scene;
uniform int rec_depth;


//int shadowMode = 0; //what is going on ? ? ?
uniform float dtoCam_min;
uniform float dtoCam_max;

//geometry
#define NB_SPHERE 8 //must be size/4
uniform vec4 spheres[NB_SPHERE]; // v[].xyz coordinate and v[].w radius
#define NB_PLANE 3
uniform vec4 planes[NB_PLANE];
uniform vec3 tetra[4];
uniform int mat_index[12]; //mat index des 8 sphere + 3 plan + tetrahedre

//lights info
uniform vec3 light_pos;
uniform vec3 La;
uniform vec3 Ld;
uniform vec3 Ls;

//materials stored as a global array
#define NB_MAT 5
uniform vec3 KAs[NB_MAT];
uniform vec3 KDs[NB_MAT];
uniform vec3 KSs[NB_MAT];
uniform float Hs[NB_MAT];
uniform float cReflects[NB_MAT];
uniform float cRefracts[NB_MAT];
uniform float Refrindexs[NB_MAT];


vec2 UV;
out vec4 fColor; // final color

void computePrimaryRay(in vec2 UV, out vec3 rayPos, out vec3 rayDir){
    rayPos = cam_pos;
    //rayDir = cam_distance * cam_forward + UV.x * cam_right + UV.y * cam_up;
    rayDir = UV.x*cam_right + UV.y*cam_up - cam_distance*cam_forward;
}

// test ray-triangle intersection, if intersect: return distance, point and normal
float rayTriangle(vec3 rayPos, vec3 rayDir, vec3 p0, vec3 p1, vec3 p2, out vec3 intersecPt, out vec3 normal){
    return -1;
} 

// test ray-sphere intersection, if intersect: return distance, point and normal
float raySphere(vec3 rayPos, vec3 rayDir, vec3 spherePos, float sphereRadius){
    vec3 oMc = rayPos - spherePos; // o minus c
    
    float a = dot(rayDir, rayDir);
    float b = 2*dot(oMc, rayDir);
    float c = dot(oMc,oMc) - sphereRadius*sphereRadius;

    float d = b*b-4*a*c;
    if(d>0){ //solution exist
        float t = (-b-sqrt(d))/(2*a);
        if(t>0){//solution are in front and not behind
            return t;
        }
    }
    return -1;
}

// test ray–plane intersection , if intersect : return distance, point and normal
float rayPlane(vec3 rayPos, vec3 rayDir, vec3 planePos, vec3 planeNormal, out vec3 intersecPt, out vec3 normal){
    return -1;

}

// find nearest intersection in the scene, , if intersect: return distance, point and normal
float computeNearestIntersection(vec3 rayPos, vec3 rayDir, out vec3 intersecI, out vec3 normalI){
    float t =  999999; //nearest

    float new_t;    
    //spheres
    for(int i = 0; i < NB_SPHERE; i++){
        new_t = raySphere(rayPos, rayDir, spheres[i].xyz, spheres[i].w);
        if(new_t > 0 && new_t < t){
            t = new_t; 
            intersecI = rayPos + t * rayDir;
            normalI = normalize(intersecI - spheres[i].xyz);
        }
    }

    if(t> 99999) return -1;
    return t;
}

vec3 shade(float t, vec3 pt, vec3 norm, int matId){
    if(t<0){
        return BGCOLOR;
    }else{
        vec3 col = vec3(0); //intermediate col before shadow
        if(shadingMode ==0 ){ //normal
            col = abs(norm);
        } else if(shadingMode == 1){ //position
            col = abs(pt);
        } else if(shadingMode == 2){//distance to cam
            float dist =  distance(cam_pos, pt);
            float v = (dist - dtoCam_min)/(dtoCam_max-dtoCam_min);
            col = vec3(v);
        }else if(shadingMode == 3){//Phong 
            col = vec3(1,0,0);
        }else if(shadingMode == 4){//bling
            col = vec3(0,1,1);
        }
        return col;
    }
}

// compute primary ray, computeNearestIntersection, shade, return color
vec3 raycast(vec2 UV){
    //compute primary ray
    vec3 rayPos, rayDir;
    computePrimaryRay(UV, rayPos, rayDir);

    //compute nearest interesection
    vec3 pt, normal;
    float t = computeNearestIntersection(rayPos, rayDir, pt, normal);

    //shade
    vec3 col = shade(t, pt, normal, 0);
    
    //return color
    return col;
} 

vec2 computeUV(){
    //todo bottle neck perf ! pass something from cpu
    vec2 uv = 2*vec2(gl_FragCoord.x/screen.x, gl_FragCoord.y/screen.y)-1;
    vec2 ratio = screen.x < screen.y ? vec2(1.0, screen.x/screen.y) : vec2(screen.y/screen.x, 1.0);
    return uv / ratio;
}

void main(){
    UV = computeUV();    
    fColor = vec4(raycast(UV),1.0);
}

/*
void main_redCircle(){
    UV = computeUV();
    vec3 color = vec3(0.f, 0.f, 0.f);
    if (length(UV)<1) color = vec3(1.f,0.f,0.f);
    fColor = vec4(color,1.0f);

    //Construct a primary ray going through UV coordinate (x,y)
    //direction = x*right + y*up - distance*forward
    //ray(t) = from + t*direction
}*/

