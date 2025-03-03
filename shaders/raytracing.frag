#version 460 core

uniform float view[2]; // send SCREEN_X and SCREEN_Y
vec2 UV; // the UV coordinates of this pixel on the canvas
out vec4 fColor; // final color

vec2 computeUV() // gl_FragCoord in [0,SCREEN_X] x [0,SCREEN_Y] => UV
{
    return ... gl_FragCoord ...
}
    void main(){
    UV = computeUV();
    vec3 color = vec3(0.f, 0.f, 0.f);
    if (length(UV)<1) color = vec3(1.f,0.f,0.f);
    fColor = vec4(color,1.0f);
}