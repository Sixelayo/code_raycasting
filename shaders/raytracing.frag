#version 430

//util pour illustrer certain truc
#define NORMAL_OFFSET 0.01 //set to 0 to observe shadow acnee, leave it to 0.01 otherwise.
#define LIGHT_WIDTH 0.5 //permet d'illustrer les softs shadows - TODO valeur approx ?

//#pragma optimize(off)




#define BGCOLOR vec4(1.0,0.15,0.15,1.0) //red BG to immediately see it in debug

uniform vec2 screen; // send SCREEN_X and SCREEN_Y

uniform vec3 cam_pos;
uniform vec3 cam_right;
uniform vec3 cam_up;
uniform vec3 cam_forward;
uniform float cam_distance;

//shader info
uniform int shadingMode;
uniform int shadowMode; 
//int shadowMode = 0; //what is going on ? ? ?
uniform float dtoCam_min;
uniform float dtoCam_max;

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
    if(d>0){ //solution exist
        float t = (-b-sqrt(d))/(2*a);
        if(t>0){//solution are in front and not behind
            intersecPt = rayPos + t * rayDir;
            normal = normalize(intersecPt - spherePos);
            return t;
        }
    }
    return -1;
}
float rayPlane(vec3 rayPos, vec3 rayDir, float planeOffset, vec3 planeNormal, out vec3 intersecPt, out vec3 normal){    
    normal = planeNormal;
    
    // Calculate denominator (dot product of ray direction and plane normal)
    float denom = dot(planeNormal, rayDir);
    
    // parallel ray
    if (abs(denom) < 0.0001) {
        return -1.0;
    }
    
    float t = (planeOffset - dot(planeNormal, rayPos)) / denom;
    
    if (t < 0.0)
        return -1.0; // No intersection

    
    intersecPt = rayPos + t * rayDir;
    return t;
}
float rayTriangle(vec3 rayPos, vec3 rayDir, vec3 p0, vec3 p1, vec3 p2, out vec3 intersecPt, out vec3 normal){
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

    // Calculate intersection point
    intersecPt = rayPos + rayDir * t;

    // Calculate triangle normal (unnormalized)
    normal = cross(edge1, edge2);
    // Normalize the normal (optional, depending on your needs)
    normal = normalize(normal);

    return t;
}
/* returns the distance to the nearest intersection of the ray (rayPos, rayDir)
if no intersection returns -1
if relevant : updates pt (intersection point), norm (normal at intersection) and matId (material at of intersected*/
float computeNearestIntersection(vec3 rayPos, vec3 rayDir, out vec3 pt, out vec3 norm, out int matId){
    float t = 999999;
    
    float new_t;
    vec3 new_pt, new_norm;
    int new_mat; 
    
    //spheres
    for(int i = 0; i < NB_SPHERE; i++){
        new_t = raySphere(rayPos, rayDir, spheres[i].xyz, spheres[i].w, new_pt, new_norm);
        if(new_t >0 && new_t < t){
            t = new_t; 
            pt = new_pt; 
            norm = new_norm;
            matId = i %NB_MAT;
        }
    }
    //planes
    for(int i = 0; i < NB_PLANE; i++){
        float new_t = rayPlane(rayPos, rayDir, planes[i].w, planes[i].xyz, new_pt, new_norm);
        if(new_t >0 && new_t < t){
            t = new_t; 
            pt = new_pt; 
            norm = new_norm;
            matId = i %NB_MAT;
        }
    }
    //triangles
    {//only tetrahedron supports for now
        vec3 pa = tetra[0];
        vec3 pb = tetra[1];
        vec3 pc = tetra[2];
        vec3 pd = tetra[3];

        new_t= rayTriangle(rayPos, rayDir, pa, pc, pb, new_pt, new_norm);
        if(new_t >0 && new_t < t){t = new_t; pt = new_pt; norm = new_norm; matId = 0;}
        new_t = rayTriangle(rayPos, rayDir, pb, pd, pc, new_pt, new_norm);
        if(new_t >0 && new_t < t){t = new_t; pt = new_pt; norm = new_norm; matId = 0;}
        new_t = rayTriangle(rayPos, rayDir, pa, pb, pd, new_pt, new_norm);
        if(new_t >0 && new_t < t){t = new_t; pt = new_pt; norm = new_norm; matId = 0;}
        new_t = rayTriangle(rayPos, rayDir, pa, pd, pc, new_pt, new_norm);
        if(new_t >0 && new_t < t){t = new_t; pt = new_pt; norm = new_norm; matId = 0;}
    }
    if(999999-t<0.1) return -1;
    return t;
}

uniform int numCalls = 2; // Ou passe cette valeur dynamiquement

void main(){
    vec2 UV = computeUV();

    //Construct a primary ray going through UV coordinate (x,y)
    vec3 main_dir = UV.x*cam_right + UV.y*cam_up - cam_distance*cam_forward;
    
    vec3 pt, norm;
    int matId;

    //compute nearest intersection
    float t = computeNearestIntersection(cam_pos, main_dir , pt, norm, matId);
    
    //compute shadow ray (depending on mode)
    if(t>0){
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
            col = La*KAs[matId]; //ambient
            col += Ld*KDs[matId]*dot(norm, L); //diffuse
            col += Ls*KSs[matId]*pow(max(0,dot(V, R)),Hs[matId]); //specular
        }else if(shadingMode == 4){//bling
            vec3 L = normalize(light_pos - pt);
            vec3 V = normalize(cam_pos - pt);
            vec3 H = normalize(L+V);
            vec3 R = reflect(-L, norm);
            col = La*KAs[matId]; //ambient
            col += Ld*KDs[matId]*dot(norm, L); //diffuse
            col += Ls*KSs[matId]*pow(max(0,dot(norm, H)),Hs[matId]); //specular
        } //todo optionel : lafortune
        


        //                 ---  shadows ---
        vec3 pt_foo, norm_foo;
        int mat_foo;
        if(shadowMode == 0){ //shadow : None
            if(UV.x > 1) col = vec3(1,0,0); //TODO REMOVE DEBUG
        }
        else{ //shadow : soft or hard
            if(shadowMode == 1){// hard shadow
                float dist_to_light_obstructer = computeNearestIntersection(pt+NORMAL_OFFSET*norm, normalize(light_pos-pt), pt_foo, norm_foo, mat_foo);
                //if intersection AND distance closer to light, obstruct
                if(dist_to_light_obstructer != -1 && dist_to_light_obstructer < distance(pt, light_pos)){
                    col = col*0.3;
                }
                if(UV.x > 0.9) col = vec3(0,1,0);
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

                // //different light pos - p:1 / n:-1/ 0
                vec3 lpos_p0 = light_pos + T * 1 * LIGHT_WIDTH + BT * 0 * LIGHT_WIDTH;
                vec3 lpos_n0 = light_pos + T * -1 * LIGHT_WIDTH + BT * 0 * LIGHT_WIDTH;
                vec3 lpos_0p = light_pos + T * 0 * LIGHT_WIDTH + BT * 1 * LIGHT_WIDTH;
                vec3 lpos_0n = light_pos + T * 0 * LIGHT_WIDTH + BT * -1 * LIGHT_WIDTH;

                // //obstruct depending on number of ray passing
                float coef = 1.0;
                // dist_to_light_obstructer : DTL1
                {//obstruct one by one

                    // le problème vient de 2 appel de computeNearestIntersection. Un seul c'est ok
                    // computeNearestIntersection(pt+NORMAL_OFFSET*norm, normalize(lpos_0p-pt), pt_foo, norm_foo, mat_foo);
                    // computeNearestIntersection(pt+NORMAL_OFFSET*norm, normalize(lpos_0n-pt), pt_foo, norm_foo, mat_foo);
                    
                    for (int var = 0; var < numCalls; var++) {
                        vec3 arg1 = (var == 0) ? normalize(lpos_0p - pt) : normalize(lpos_0n - pt);
                        computeNearestIntersection(pt + NORMAL_OFFSET * norm, arg1, pt_foo, norm_foo, mat_foo);
                    }
                    
                    // float dtlo_1 = computeNearestIntersection(pt+NORMAL_OFFSET*norm, normalize(light_pos-pt), pt_foo, norm_foo, mat_foo);
                    // if(dtlo_1 > 0 && dtlo_1 < distance(pt, light_pos)) coef -= 0.2;
                    // float dtlo_2 = computeNearestIntersection(pt+NORMAL_OFFSET*norm, normalize(lpos_0p-pt), pt_foo, norm_foo, mat_foo);
                    // if(dtlo_2 > 0 && dtlo_2 < distance(pt, lpos_0p)) coef -= 0.2;
                    // float dtlo_3 = computeNearestIntersection(pt+NORMAL_OFFSET*norm, normalize(lpos_0n-pt), pt_foo, norm_foo, mat_foo);
                    // if(dtlo_3 > 0 && dtlo_3 < distance(pt, lpos_0n)) coef -= 0.2;
                    // float dtlo_4 = computeNearestIntersection(pt+NORMAL_OFFSET*norm, normalize(lpos_p0-pt), pt_foo, norm_foo, mat_foo);
                    // if(dtlo_4 > 0 && dtlo_4 < distance(pt, lpos_p0)) coef -= 0.2;
                    // float dtlo_5 = computeNearestIntersection(pt+NORMAL_OFFSET*norm, normalize(lpos_n0-pt), pt_foo, norm_foo, mat_foo);
                    // if(dtlo_5 > 0 && dtlo_5 < distance(pt, lpos_n0)) coef -= 0.2;
                }
                
                col = col * coef;
                if(UV.x < -0.9) col = vec3(0,0,1);
            }
        }

        fColor = vec4(col,1.0);
    } else{
        fColor = BGCOLOR;
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

