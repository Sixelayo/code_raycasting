#version 430

uniform vec2 screen; // send SCREEN_X and SCREEN_Y

uniform vec3 cam_pos;
uniform vec3 cam_right;
uniform vec3 cam_up;
uniform vec3 cam_forward;
uniform float cam_distance;

uniform int shadingMode;
uniform float dtoCam_min;
uniform float dtoCam_max;

out vec4 fColor; // final color



vec2 computeUV(){
    //todo bottle neck perf ! pass something from cpu
    // gl_FragCoord in [0,SCREEN_X] x [0,SCREEN_Y] => UV (in -1;1 and clamped for big)
    vec2 uv = 2*vec2(gl_FragCoord.x/screen.x, gl_FragCoord.y/screen.y)-1;
    vec2 ratio = screen.x < screen.y ? vec2(1.0, screen.x/screen.y) : vec2(screen.y/screen.x, 1.0);
    return uv/ratio;
}

float raySphere(vec3 rayPos, vec3 rayDir, vec3 spherePos, float sphereRadius, out vec3 intersecPt, out vec3 normal){
    vec3 oMc = rayPos - spherePos; // o minus c
    
    float a = dot(rayDir, rayDir);
    float b = 2*dot(oMc, rayDir);
    float c = dot(oMc,oMc) - sphereRadius*sphereRadius;

    float d = b*b-4*a*c;
    if(d>0){
        //TODO optimisation : no need to write if t is negative
        float t = (-b+sqrt(d))/(2*a);
        intersecPt = rayPos + t * rayDir;
        normal = normalize(intersecPt - spherePos);
        return t;
    }
    return -1;
}


void main(){
    vec2 UV = computeUV();

    //Construct a primary ray going through UV coordinate (x,y)
    vec3 main_dir = UV.x*cam_right + UV.y*cam_up - cam_distance*cam_forward;

    //foreach sphere ...
    vec3 pt, norm;
    float t = raySphere(cam_pos, main_dir, vec3(0), 1.0, pt, norm);
    
    if(t>0){
        if(shadingMode ==0 ){ //normal
            fColor = vec4(norm,1.0);
        } else if(shadingMode == 1){ //position
            fColor = vec4(pt,1.0);
        } else if(shadingMode == 2){//distance to cam
            float dist =  distance(cam_pos, pt);
            float v = (dist - dtoCam_min)/(dtoCam_max-dtoCam_min);
            fColor = vec4(vec3(v),1.0);
        }
        //fColor = vec4(norm.xyz,1.0);
    } else{
        fColor = vec4(0.15,0.15,0.15,1.0);
    }

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

