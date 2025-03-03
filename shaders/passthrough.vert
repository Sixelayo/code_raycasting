#version 460 core

in vec4 in_position; // [-1,1] x [-1,1] quad
void main(){
    gl_Position = in_position; // no work
}