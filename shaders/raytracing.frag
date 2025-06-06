#version 430

//util pour illustrer certain truc
#define NORMAL_OFFSET 0.0001 //set to 0 to observe shadow acnee, leave it to 0.01 otherwise.
#define LIGHT_WIDTH 0.5 //permet d'illustrer les softs shadows - TODO valeur approx ?
#define CHECKER_SIZE 3

//#pragma optimize(off)


#define BGCOLOR vec3(1.0,0.15,0.15) //red BG to immediately see it in debug
#define TAU 6.28318530718


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
uniform int motion_blurr = 0;
uniform vec3 mb_dir = vec3(1,0,0);
uniform int MOTION_BLURR_SAMPLE = 25;
uniform int antialiasing = 0;


//int shadowMode = 0; //what is going on ? ? ?
uniform float dtoCam_min;
uniform float dtoCam_max;
uniform int SOFT_SHADOW_SAMPLE = 100;
uniform float SHADOW_SIZE;

//geometry
#define NB_SPHERE 8 //must be size/4
uniform vec4 spheres[NB_SPHERE]; // v[].xyz coordinate and v[].w radius
#define NB_PLANE 3
uniform vec4 planes[NB_PLANE];
uniform vec3 tetra[4];

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
#define MAT_CHECKER -1

out vec4 fColor; // final color


//taken from shader toy
uint murmurHash12(uvec2 src) {
    const uint M = 0x5bd1e995u;
    uint h = 1190494759u;
    src *= M; src ^= src>>24u; src *= M;
    h *= M; h ^= src.x; h *= M; h ^= src.y;
    h ^= h>>13u; h *= M; h ^= h>>15u;
    return h;
}
float hash12(vec2 src) {
    uint h = murmurHash12(floatBitsToUint(src));
    return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}
float _randomvalue;
uint murmurHash11(uint src) {
    const uint M = 0x5bd1e995u;
    uint h = 1190494759u;
    src *= M; src ^= src>>24u; src *= M;
    h *= M; h ^= src;
    h ^= h>>13u; h *= M; h ^= h>>15u;
    return h;
}

// 1 output, 1 input
float hash11(float src) {
    uint h = murmurHash11(floatBitsToUint(src));
    return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}



vec2 computeUV(){
    //todo bottle neck perf ! pass something from cpu
    // gl_FragCoord in [0,SCREEN_X] x [0,SCREEN_Y] => UV (in -1;1 and clamped for big)
    vec2 uv = 2*vec2(gl_FragCoord.x/screen.x, gl_FragCoord.y/screen.y)-1;
    vec2 ratio = screen.x < screen.y ? vec2(1.0, screen.x/screen.y) : vec2(screen.y/screen.x, 1.0);
    return uv/ratio;
}

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
float rayPlane(vec3 rayPos, vec3 rayDir, float planeOffset, vec3 planeNormal){        
    // Calculate denominator (dot product of ray direction and plane normal)
    float denom = dot(planeNormal, rayDir);
    
    // parallel ray
    if (abs(denom) < 0.0001) {
        return -1.0;
    }
    
    float t = (planeOffset - dot(planeNormal, rayPos)) / denom;
    
    if (t < 0.0)
        return -1.0; // No intersection

    return t;
}
float rayTriangle(vec3 rayPos, vec3 rayDir, vec3 p0, vec3 p1, vec3 p2){
    const float EPSILON = 0.000001;

    // Calculate edges of the triangle
    vec3 edge1 = p1 - p0;
    vec3 edge2 = p2 - p0;

    // Calculate determinant
    vec3 h = cross(rayDir, edge2);
    float a = dot(edge1, h);

    // Check if ray is parallel to triangle
    if (abs(a) < EPSILON) {
        return -1.0; // Ray is parallel, no intersection
    }

    float f = 1.0 / a;
    vec3 s = rayPos - p0;
    float u = f * dot(s, h);

    // Check if intersection is outside triangle (u coordinate)
    if (u < 0.0 || u > 1.0) {
        return -1.0;
    }

    vec3 q = cross(s, edge1);
    float v = f * dot(rayDir, q);

    // Check if intersection is outside triangle (v coordinate and u+v)
    if (v < 0.0 || u + v > 1.0) {
        return -1.0;
    }

    // Calculate distance t along the ray
    float t = f * dot(edge2, q);

    // Check if intersection is behind ray origin
    if (t < EPSILON) {
        return -1.0; // Intersection behind ray origin
    }
    return t;
}
/* returns the distance to the nearest intersection of the ray (rayPos, rayDir)
if no intersection returns -1
if relevant : updates pt (intersection point), norm (normal at intersection) and matId (material at of intersected)

raySphere - rayPlane - rayTriangle returns -1 if no intersection, t the distance to intersection if intersect*/
float computeNearestIntersection(vec3 rayPos, vec3 rayDir, out vec3 pt, out vec3 norm, out int matId){
    float t = 999999;
    
    float new_t;    
    //spheres
    for(int i = 0; i < NB_SPHERE; i++){
        new_t = raySphere(rayPos, rayDir, spheres[i].xyz, spheres[i].w);
        if(new_t > 0 && new_t < t){
            t = new_t; 
            pt = rayPos + t * rayDir;
            norm = normalize(pt - spheres[i].xyz);
            if(scene ==1){
                matId = i%NB_MAT;
            }else if(scene ==2){
                switch(i){ //in scene 2:
                    case 0: matId=0; break; //100% reflective 
                    case 1: matId=1; break; //100% refractive solid
                    case 2: matId=1; break; //100% refractive hollow
                    case 3: matId=2; break; //100% refractive hollow inside
                    case 4: matId=3; break; //50% relective 50% refractive
                    default:matId=4; break; //another color unset
                }
            }
        }
    }
    //planes
    for(int i = 0; i < NB_PLANE; i++){
        float new_t = rayPlane(rayPos, rayDir, planes[i].w, planes[i].xyz);
        if(new_t >0 && new_t < t){
            t = new_t; 
            pt = rayPos + t * rayDir; 
            norm = planes[i].xyz;
            matId = scene == 1 ? i %NB_MAT : MAT_CHECKER;
        }
    }
    //triangles
    if(scene==1){//only tetrahedron in scene 1 supports for now
        vec3 pa = tetra[0];
        vec3 pb = tetra[1];
        vec3 pc = tetra[2];
        vec3 pd = tetra[3];

        new_t = rayTriangle(rayPos, rayDir, pa, pc, pb);
        if(new_t >0 && new_t < t){t = new_t; pt = rayPos + rayDir*t; norm=normalize(cross(pc-pa, pb-pa)); matId = 4;}
        new_t = rayTriangle(rayPos, rayDir, pb, pd, pc);
        if(new_t >0 && new_t < t){t = new_t; pt = rayPos + rayDir*t; norm=normalize(cross(pd-pb, pc-pb)); matId = 4;}
        new_t = rayTriangle(rayPos, rayDir, pa, pb, pd);
        if(new_t >0 && new_t < t){t = new_t; pt = rayPos + rayDir*t; norm=normalize(cross(pb-pa, pd-pa)); matId = 4;}
        new_t = rayTriangle(rayPos, rayDir, pa, pd, pc);
        if(new_t >0 && new_t < t){t = new_t; pt = rayPos + rayDir*t; norm=normalize(cross(pd-pa, pc-pa)); matId = 4;}
    }
    if(999999-t<0.1){
        return -1;
    }
    return t;
}

vec3 evalColor(float t, vec3 pt, vec3 norm, int matId){
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
        } else if(shadingMode == 3){//Phong
            vec3 L = normalize(light_pos - pt);
            vec3 V = normalize(cam_pos - pt);
            vec3 R = reflect(-L, norm);
            if(matId == MAT_CHECKER){
                col = int(floor(pt.x / CHECKER_SIZE) + floor(pt.z / CHECKER_SIZE)) % 2 == 0 ? vec3(1) : vec3(0);
            } else{
                col = La*KAs[matId]; //ambient
                col += Ld*KDs[matId]*dot(norm, L); //diffuse
                col += Ls*KSs[matId]*pow(max(0,dot(V, R)),Hs[matId]); //specular
            }
        }else if(shadingMode == 4){//bling
            vec3 L = normalize(light_pos - pt);
            vec3 V = normalize(cam_pos - pt);
            vec3 H = normalize(L+V);
            vec3 R = reflect(-L, norm);
            if(matId == MAT_CHECKER){
                col = int(floor(pt.x / CHECKER_SIZE) + floor(pt.z / CHECKER_SIZE)) % 2 == 0 ? vec3(1) : vec3(0);
            } else{
                col = La*KAs[matId]; //ambient
                col += Ld*KDs[matId]*dot(norm, L); //diffuse
                col += Ls*KSs[matId]*pow(max(0,dot(norm, H)),Hs[matId]); //specular
            }
        } //todo optionel : lafortune
        
        //                 ---  shadows ---
        vec3 pt_foo, norm_foo;
        int mat_foo;
        if(shadowMode == 0){ //shadow : None
        }
        else{ //shadow : soft or hard
            if(shadowMode == 1){// hard shadow
                float dist_to_light_obstructer = computeNearestIntersection(pt+NORMAL_OFFSET*norm, normalize(light_pos-pt), pt_foo, norm_foo, mat_foo);
                //if intersection AND distance closer to light, obstruct
                if(dist_to_light_obstructer != -1 && dist_to_light_obstructer < distance(pt, light_pos)){
                    col = col*0.3;
                }
            } 
            else if(shadowMode == 2){ //soft shadow
                //get a non colinear vector in general case : (set one of the smallest component to 1)
                vec3 pt_l = normalize(light_pos-pt);
                vec3 absN = abs(normalize(light_pos-pt));
                vec3 arbitrary = vec3(
                    absN.x <= absN.y && absN.x <= absN.z ? 1.0 : 0.0,
                    absN.y < absN.x && absN.y <= absN.z ? 1.0 : 0.0,
                    absN.z < absN.x && absN.z < absN.y ? 1.0 : 0.0);
                    
                //get Tanget, Bitangent
                vec3 T = cross(pt_l, arbitrary);
                vec3 BT = cross(pt_l, T);

                int nb_blocked = 0;
                for(int i=0; i < SOFT_SHADOW_SAMPLE; i++){
                    float angle = _randomvalue * TAU;
                    _randomvalue = hash11(_randomvalue);
                    float size = sqrt(_randomvalue) * SHADOW_SIZE;
                    _randomvalue = hash11(_randomvalue);
                    vec3 samp_pt_l = light_pos + (T*cos(angle) + BT*sin(angle))* size;
                    float dist_to_light_obstructer = computeNearestIntersection(pt+NORMAL_OFFSET*norm, normalize(samp_pt_l-pt), pt_foo, norm_foo, mat_foo);
                    //if intersection AND distance closer to light, obstruct
                    if(dist_to_light_obstructer != -1 && dist_to_light_obstructer < distance(pt, samp_pt_l)){
                        nb_blocked+=1;
                    }
                }
                col = col * (1-float(nb_blocked)/float(SOFT_SHADOW_SAMPLE));
            }
        }

        return col;
    }
}


vec3 trace4(vec3 ray_src, vec3 ray_dir){
    vec3 pt, norm;
    int matId;
    float t = computeNearestIntersection(ray_src, ray_dir , pt, norm, matId);
    vec3 shading = evalColor(t, pt, norm, matId);
    return shading;
}

vec3 trace3(vec3 ray_src, vec3 ray_dir){
    vec3 pt, norm;
    int matId;
    float t = computeNearestIntersection(ray_src, ray_dir , pt, norm, matId);
    vec3 shading = evalColor(t, pt, norm, matId);
    if(t > 0 && matId>=0){ //only multi ray if hit and regular material negative material index use directly eval
        shading = (1-cReflects[matId]-cRefracts[matId])*shading;
        if(rec_depth >= 4){
            if (cReflects[matId]>0.001){
                shading += cReflects[matId] * trace4(pt+0.0001*norm, reflect(ray_dir, norm));
            }if (cRefracts[matId]>0.001){
                shading += cRefracts[matId] * trace4(pt-0.0001*norm, refract(ray_dir, norm, Refrindexs[matId]));
            }
        }
    }
    return shading;
}



vec3 trace2(vec3 ray_src, vec3 ray_dir){
    vec3 pt, norm;
    int matId;
    float t = computeNearestIntersection(ray_src, ray_dir , pt, norm, matId);
    vec3 shading = evalColor(t, pt, norm, matId);
    if(t > 0 && matId>=0){ //only multi ray if hit and regular material negative material index use directly eval
        shading = (1-cReflects[matId]-cRefracts[matId])*shading;
        if(rec_depth >= 3){
            if (cReflects[matId]>0.001){
                shading += cReflects[matId] * trace3(pt+0.0001*norm, reflect(ray_dir, norm));
            }if (cRefracts[matId]>0.001){
                shading += cRefracts[matId] * trace3(pt-0.0001*norm, refract(ray_dir, norm, Refrindexs[matId]));
            }
        }
    }
    return shading;
}

vec3 trace1(vec3 ray_src, vec3 ray_dir){
    vec3 pt, norm;
    int matId;
    float t = computeNearestIntersection(ray_src, ray_dir , pt, norm, matId);
    vec3 shading = evalColor(t, pt, norm, matId);
    if(t > 0 && matId>=0){ //only multi ray if hit and regular material negative material index use directly eval
        shading = (1-cReflects[matId]-cRefracts[matId])*shading;
        if(rec_depth >= 2){
            if (cReflects[matId]>0.001){
                shading += cReflects[matId] * trace2(pt+0.0001*norm, reflect(ray_dir, norm));
            }if (cRefracts[matId]>0.001){
                shading += cRefracts[matId] * trace2(pt-0.0001*norm, refract(ray_dir, norm, Refrindexs[matId]));
            }
        }
    }
    return shading;
}


struct Hit {
    float t; // distance
    vec3 normal; // surface normal
    int mat; // surface material index
};struct Roth {
    int n;
    Hit hit[8]; // max 8 hit points
};// CSG filters

Roth unionCSG(Roth r1, Roth r2) {
    Roth r;
    r.n = 0;
    int i = 0;
    int j = 0;
    bool r1in = false; // Tracks if ray is inside r1
    bool r2in = false; // Tracks if ray is inside r2
    while(i < r1.n || j < r2.n) {
        bool takeR1 = false;
        if(i < r1.n && //something left on 1
            (j >= r2.n || //nothing left on 2
                        r1.hit[i].t < r2.hit[j].t) //hit on r1 closing than hit on r2
            ) {
            takeR1 = true;
        }
        if(takeR1) {
            r1in = !r1in;
            if(!r2in) r.hit[r.n++] = r1.hit[i];
            i++;
        } else {
            r2in = !r2in;
            if(!r1in) r.hit[r.n++] = r2.hit[j];
            j++;
        }
    }
    return r;
}

Roth intersectionCSG(Roth r1, Roth r2){
    Roth r;
    r.n = 0;

    int i = 0;
    int j = 0;
    bool r1in = false; // Tracks if ray is inside r1
    bool r2in = false; // Tracks if ray is inside r2

    while (i < r1.n || j < r2.n) {
        // Determine which hit to process next based on t value
        bool takeR1 = false;
        if (i < r1.n && (j >= r2.n || r1.hit[i].t < r2.hit[j].t)) {
            takeR1 = true;
        }

        // Process the next hit point
        if (takeR1) {
            // Toggle r1in state: entering or exiting r1
            r1in = !r1in;
            // Check if we are entering or exiting the intersection
            if (r2in) { // Only output if inside r2
                r.hit[r.n] = r1.hit[i];
                r.n++;
            }
            i++;
        } else {
            // Toggle r2in state: entering or exiting r2
            r2in = !r2in;
            // Check if we are entering or exiting the intersection
            if (r1in) { // Only output if inside r1
                r.hit[r.n] = r2.hit[j];
                r.n++;
            }
            j++;
        }
    }

    return r;
}

Roth complementCSG(Roth r) {
    Roth result;
    result.n = 0;

    // Copy hits in reverse order with reversed normals
    for (int i = 0; i < r.n; i++) {
        result.hit[i].t = r.hit[r.n - 1 - i].t;
        result.hit[i].normal = -r.hit[r.n - 1 - i].normal; // Reverse normal
        result.hit[i].mat = r.hit[r.n - 1 - i].mat; // Keep material
        result.n++;
    }

    return result;
}

Roth differenceCSG(Roth r1, Roth r2) {
    Roth r;
    r.n = 0;

    int i = 0;
    int j = 0;
    bool r1in = false; // Tracks if ray is inside r1
    bool r2in = false; // Tracks if ray is inside r2 (for complement, we want !r2in)

    float r2dist=-1;

    while (i < r1.n || j < r2.n) {
        // Determine which hit to process next based on t value
        bool takeR1 = false;
        if (i < r1.n && (j >= r2.n || r1.hit[i].t < r2.hit[j].t)) {
            takeR1 = true;
        }

        if (takeR1) {
            // Process r1 hit: toggle r1in
            r1in = !r1in;
            // Output if inside r1 and outside r2 (i.e., inside complement of r2)
            if (!r2in) {
                r.hit[r.n] = r1.hit[i];
                //r.hit[r.n].mat = 4; //debug
                r.n++;
            }
            i++;
        } else {
            // Process r2 hit: toggle r2in (complement means we're interested in !r2in)
            r2in = !r2in;
            // Output if inside r1 and outside r2
            if (r1in) {
                r.hit[r.n] = r2.hit[j];
                r.hit[r.n].normal = -r2.hit[j].normal; // Reverse normal for complement
                r.hit[r.n].mat = r2.hit[j].mat; // Reverse normal for complement
                r.n++;
            }
            j++;
        }
    }

    return r;
}

Roth raySphereCSG(vec3 rayPos, vec3 rayDir, vec3 sphPos, float sphRad, int mat) {
    Roth r;
    r.n = 0;

    vec3 oMc = rayPos - sphPos;

    float a = dot(rayDir, rayDir);
    float b = 2.0 * dot(oMc, rayDir);
    float c = dot(oMc, oMc) - sphRad * sphRad;

    float d = b * b - 4.0 * a * c;
    if(d > 0.0) {
        float sqrt_d = sqrt(d);
        float t1 = (-b - sqrt_d) / (2.0 * a);
        float t2 = (-b + sqrt_d) / (2.0 * a);

        if(t1 > 0.0) {
            r.hit[r.n].t = t1;
            r.hit[r.n].normal = normalize((rayPos + t1 * rayDir) - sphPos);
            r.hit[r.n].mat = mat;
            r.n++;
        }
        if(t2 > 0.0) {
            r.hit[r.n].t = t2;
            r.hit[r.n].normal = normalize((rayPos + t2 * rayDir) - sphPos);
            r.hit[r.n].mat = mat;
            r.n++;
        }
    }
    return r;
}

float rayCSG(vec3 rayPos, vec3 rayDir, out vec3 intersecPt, out vec3 normal, out int materialIndex) { 
    Roth s1 = raySphereCSG(rayPos, rayDir, vec3(-1, 2, 0), 1.5, 1); //red
    Roth s2 = raySphereCSG(rayPos, rayDir, vec3(1, 2, 0), 1.5, 1);
    Roth s3 = raySphereCSG(rayPos, rayDir, vec3(0,2.7,-0.3), 0.8, 2); //blue 
    Roth s4 = raySphereCSG(rayPos, rayDir, vec3(0,2.8,0.3), 0.8, 3); //green
    Roth step1 = intersectionCSG(s1,s2);
    Roth step2 = unionCSG(step1, s3);
    Roth r = differenceCSG(step2, s4);

    if(r.n > 0){
        float tMin = r.hit[0].t;
        intersecPt = rayPos + tMin * rayDir;
        normal = r.hit[0].normal;
        materialIndex = r.hit[0].mat;
        return tMin;
    } else {
        return -1;
    }
}

void main_csg() {
    vec2 UV = computeUV();
    vec3 rayOrigin = cam_pos;
    vec3 rayDirection = normalize(UV.x * cam_right + UV.y * cam_up - cam_distance * cam_forward);

    vec3 p, n;
    int mat;
    float t = rayCSG(rayOrigin, rayDirection, p, n, mat);

    if(t > 0.0) {
        //fColor = shade(p, n, mat);
        if(mat ==1) fColor = vec4(1,0,0,1);
        if(mat ==2) fColor = vec4(0,0,1,1);
        if(mat ==3) fColor = vec4(0,1,0,1);
        if(mat ==4) fColor = vec4(1,1,1,1);
        //fColor = vec4(abs(n), 1);
    } else {
        fColor = vec4(0,0,0,1);
    }
}


void main(){
    vec2 UV = computeUV();
    _randomvalue = hash12(UV);

    //Construct a primary ray going through UV coordinate (x,y)
    vec3 main_dir = UV.x*cam_right + UV.y*cam_up - cam_distance*cam_forward;


    if(scene == 3){
        main_csg();
        return;
    }
    //rest of that is not about csg :
    
    vec3 pt, norm;
    int matId;

    vec3 shading = vec3(0);


    if(motion_blurr>0){
        vec3 add_motion = vec3(0);
        for(int i=0; i< MOTION_BLURR_SAMPLE; i++){
            vec3 add_motion = _randomvalue * mb_dir;
            _randomvalue = hash11(_randomvalue);
            float t = computeNearestIntersection(cam_pos+add_motion, main_dir , pt, norm, matId);
            //compute shadow ray (depending on mode)
            shading += evalColor(t, pt, norm, matId);
            if(t > 0 && matId>=0){ //only multi ray if hit and regular material negative material index use directly eval
                shading = (1-cReflects[matId]-cRefracts[matId])*shading;
                if(rec_depth >= 1){
                    if (cReflects[matId]>0.001){
                        shading += cReflects[matId] * trace1(pt+0.0001*norm, reflect(main_dir, norm));
                        // vec3 V = main_dir; vec3 N = norm;
                        // shading += cReflects[matId] * trace1(pt+0.0001*norm, V - 2 * dot(V,N)*N);
                    }if (cRefracts[matId]>0.001){
                        shading += cRefracts[matId] * trace1(pt-0.0001*norm, refract(main_dir, norm, Refrindexs[matId]));
                    }
                }
            }
        }
        shading /= MOTION_BLURR_SAMPLE;
    } else{//no motion blurr

        if(antialiasing == 0){
            //compute nearest intersection
            float t = computeNearestIntersection(cam_pos, main_dir , pt, norm, matId);
            //compute shadow ray (depending on mode)
            shading = evalColor(t, pt, norm, matId);
            if(t > 0 && matId>=0){ //only multi ray if hit and regular material negative material index use directly eval
                shading = (1-cReflects[matId]-cRefracts[matId])*shading;
                if(rec_depth >= 1){
                    if (cReflects[matId]>0.001){
                        shading += cReflects[matId] * trace1(pt+0.0001*norm, reflect(main_dir, norm));
                        // vec3 V = main_dir; vec3 N = norm;
                        // shading += cReflects[matId] * trace1(pt+0.0001*norm, V - 2 * dot(V,N)*N);
                    }if (cRefracts[matId]>0.001){
                        shading += cRefracts[matId] * trace1(pt-0.0001*norm, refract(main_dir, norm, Refrindexs[matId]));
                    }
                }
            }
        } else{ //anti aliasing enabled : no depth for this
            vec3 dx = 0.5* cam_right / screen.x;
            vec3 dy = 0.5* cam_up / screen.y;
            
            float t;
            t = computeNearestIntersection(cam_pos, main_dir +dx +dy, pt, norm, matId);
            shading += evalColor(t, pt, norm, matId);
            t = computeNearestIntersection(cam_pos, main_dir +dx -dy, pt, norm, matId);
            shading += evalColor(t, pt, norm, matId);
            t = computeNearestIntersection(cam_pos, main_dir -dx -dy, pt, norm, matId);
            shading += evalColor(t, pt, norm, matId);
            t = computeNearestIntersection(cam_pos, main_dir -dx +dy, pt, norm, matId);
            shading += evalColor(t, pt, norm, matId);
            shading /= 4;
        }
    }
    
    fColor = vec4(shading,1.0);

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

